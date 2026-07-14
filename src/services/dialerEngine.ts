// Campaign dialer engine — a faithful port of VocalMax's client-side scheduler.
//
// It runs on a 10-second tick while a campaign detail page is open. Each tick:
//   1. Syncs in-flight calls (status="calling") by polling Retell get-call, and
//      maps the outcome onto the lead's state machine (completed / no-answer /
//      failed, with retry scheduling up to max_attempts -> unresponsive).
//   2. Fills free concurrency slots — retry-due leads first, then pending leads —
//      by placing one Retell create-phone-call per lead, gated by calling hours
//      and the DNC list.
//   3. Marks the campaign completed once every lead is done.
//
// All activity streams to a "Live System Logs" console (last 200 entries).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { retellService, RetellApiError } from "@/services/retellService";
import { getCampaign, updateCampaign } from "@/services/campaignsService";
import { getAgent } from "@/services/agentsService";
import { listLeads, updateLead, type LeadRow, type LeadStatus } from "@/services/leadsService";
import { getCredits, chargeForCall } from "@/services/creditsService";
import { isWithinCallingHours, type CallingHours } from "@/lib/callingHours";
import { loadDynamicVars } from "@/lib/dynamicVars";

const TICK_MS = 10_000;
const CALL_TIMEOUT_MS = 15 * 60 * 1000;

export type DialerLogType = "info" | "success" | "warn" | "error" | "debug";
export interface DialerLog {
  time: string;
  msg: string;
  type: DialerLogType;
}

export interface DialerDeps {
  log: (msg: string, type?: DialerLogType) => void;
  callingHours?: CallingHours | null;
  dnc?: Set<string>;
}

function hhmmss(): string {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Map a finished Retell call to a lead status (VocalMax's disconnection_reason logic).
function mapEndedCallToStatus(call: {
  call_status?: string;
  disconnection_reason?: string;
}): Exclude<LeadStatus, "pending" | "calling" | "unresponsive" | "dnc"> {
  const reason = (call.disconnection_reason || "").toLowerCase();
  if (call.call_status === "not_connected") return "no-answer";
  if (
    reason.includes("permission_denied") ||
    reason.includes("failed") ||
    reason.includes("error") ||
    call.call_status === "error"
  ) {
    return "failed";
  }
  if (
    reason.includes("no_answer") ||
    reason.includes("busy") ||
    reason === "dial_no_answer" ||
    reason === "dial_busy"
  ) {
    return "no-answer";
  }
  return "completed";
}

// Schedule a retry or mark unresponsive after a failed / no-answer outcome.
function retryPatch(lead: LeadRow, maxAttempts: number, retryDelayMinutes: number) {
  const attempts = lead.attempt_count ?? 1;
  if (attempts >= maxAttempts) {
    return {
      status: "unresponsive" as LeadStatus,
      unresponsive_at: new Date().toISOString(),
      next_retry_at: null,
    };
  }
  const next = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
  return { next_retry_at: next.toISOString() };
}

// Place a single outbound call for one lead.
async function dispatchCall(
  campaign: NonNullable<Awaited<ReturnType<typeof getCampaign>>>,
  agent: NonNullable<Awaited<ReturnType<typeof getAgent>>>,
  lead: LeadRow,
  deps: DialerDeps,
): Promise<void> {
  const maxAttempts = campaign.max_attempts ?? 3;
  const retryDelay = campaign.retry_delay_minutes ?? 60;

  // Calling-hours gate.
  if (!isWithinCallingHours(deps.callingHours, new Date())) {
    deps.log(`[CallingHours] Skipped ${lead.phone} — outside allowed calling hours.`, "warn");
    return;
  }

  // DNC gate.
  if (deps.dnc?.has(lead.phone)) {
    deps.log(`[DNC] ${lead.phone} is on the block list. Marking DNC.`, "warn");
    await updateLead(lead.id, { status: "dnc", next_retry_at: null });
    return;
  }

  // Claim the lead (only if not already calling/done) and increment the attempt.
  const { data: claimed } = await supabase
    .from("leads")
    .update({
      status: "calling",
      called_at: new Date().toISOString(),
      attempt_count: (lead.attempt_count ?? 0) + 1,
    })
    .eq("id", lead.id)
    .in("status", ["pending", "failed", "no-answer"])
    .select("id");
  if (!claimed || claimed.length === 0) {
    deps.log(`[SKIP] ${lead.phone} already being processed or completed.`, "warn");
    return;
  }

  const fromNumber = agent.phone_number?.trim();
  if (!fromNumber) {
    await updateLead(lead.id, { status: "pending" });
    deps.log(`[ERR] Agent "${agent.name}" has no phone number configured.`, "error");
    return;
  }

  // Retell dynamic variables: user default vars (base) + lead custom_data + name aliases.
  const vars: Record<string, string> = {
    ...loadDynamicVars(),
    ...((lead.custom_data as Record<string, string>) ?? {}),
  };
  if (lead.name && lead.name !== "Friend") {
    vars.name ??= lead.name;
    vars.Name ??= lead.name;
    vars.customer_name ??= lead.name;
  }

  deps.log(`[EXEC] Dialing ${lead.phone} for ${lead.name ?? "lead"}…`, "info");
  try {
    const call = await retellService.createPhoneCall({
      from_number: fromNumber,
      to_number: lead.phone,
      override_agent_id: agent.retell_agent_id as string,
      metadata: { leadId: lead.id, campaignId: campaign.campaign_id },
      retell_llm_dynamic_variables: vars,
    });
    if (!call?.call_id) throw new RetellApiError("Retell did not return a call_id.");

    await updateLead(lead.id, { retell_call_id: call.call_id });
    await supabase.from("calls").insert({
      retell_call_id: call.call_id,
      agent_id: agent.retell_agent_id,
      agent_name: agent.name,
      from_number: fromNumber,
      to_number: lead.phone,
      direction: "outbound",
      call_type: "phone_call",
      status: "initiated",
      campaign_id: campaign.campaign_id,
      lead_name: lead.name,
    });
    await updateCampaign(campaign.campaign_id, {
      called_leads: (campaign.called_leads ?? 0) + 1,
    });
    await supabase.from("consent_log").insert({
      lead_id: lead.id,
      campaign_id: campaign.campaign_id,
      phone: lead.phone,
      consent_basis: "legitimate_interest",
    });
    deps.log(`[SUCCESS] Call initiated: ${call.call_id}`, "success");
  } catch (err) {
    const status = err instanceof RetellApiError ? err.status : undefined;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 403 || message.toLowerCase().includes("do not call")) {
      deps.log(`[DNC] Blocked call to ${lead.phone}. Marking DNC.`, "warn");
      await updateLead(lead.id, { status: "dnc", next_retry_at: null });
      return;
    }
    deps.log(`[FAIL] Call failed for ${lead.phone}: ${message}`, "error");
    await updateLead(lead.id, { status: "failed", ...retryPatch(lead, maxAttempts, retryDelay) });
    await updateCampaign(campaign.campaign_id, {
      failed_calls: (campaign.failed_calls ?? 0) + 1,
    });
  }
}

// One scheduler iteration for a campaign.
async function runTick(campaignId: string, deps: DialerDeps): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.status !== "running") return;

  const agent = campaign.agent_id ? await getAgent(campaign.agent_id) : null;
  if (!agent || !agent.retell_agent_id) {
    deps.log("[ERR] Campaign has no synced Retell agent — pausing.", "error");
    await updateCampaign(campaignId, { status: "paused", paused_reason: "no_agent" });
    return;
  }

  const maxAttempts = campaign.max_attempts ?? 3;
  const retryDelay = campaign.retry_delay_minutes ?? 60;
  const leads = await listLeads(campaignId);

  // 1. Sync in-flight calls.
  let inFlight = 0;
  for (const lead of leads.filter((l) => l.status === "calling")) {
    if (lead.called_at && Date.now() - new Date(lead.called_at).getTime() > CALL_TIMEOUT_MS) {
      deps.log(`[TIMEOUT] ${lead.phone} timed out (>15m). Force-failing.`, "error");
      await updateLead(lead.id, { status: "failed", ...retryPatch(lead, maxAttempts, retryDelay) });
      continue;
    }
    if (!lead.retell_call_id) {
      await updateLead(lead.id, { status: "failed" });
      continue;
    }
    try {
      const call = await retellService.getCall(lead.retell_call_id);
      const s = call?.call_status;
      if (s === "ended" || s === "error" || s === "not_connected") {
        const mapped = mapEndedCallToStatus(call);
        deps.log(`[UPDATE] ${lead.phone} → ${mapped} (${call.disconnection_reason ?? "—"})`, "info");

        // Enrich from the get-call response (transcript is available at end;
        // call_analysis may lag and gets filled in later by the webhook).
        const analysis = (call as { call_analysis?: { call_summary?: string; user_sentiment?: string } })
          .call_analysis ?? {};
        const enrich = {
          transcript: (call.transcript as string | undefined) ?? null,
          summary: analysis.call_summary ?? null,
          sentiment: analysis.user_sentiment ?? null,
        };

        if (mapped === "failed" || mapped === "no-answer") {
          await updateLead(lead.id, { status: mapped, ...enrich, ...retryPatch(lead, maxAttempts, retryDelay) });
        } else {
          await updateLead(lead.id, { status: "completed", next_retry_at: null, ...enrich });
        }

        await supabase
          .from("calls")
          .update({
            status: call.call_status,
            transcript: enrich.transcript,
            recording_url: (call.recording_url as string | undefined) ?? null,
            summary: enrich.summary,
            has_transcript: !!enrich.transcript,
          })
          .eq("retell_call_id", lead.retell_call_id as string);

        // Classify the lead (best-effort; sets lead_status + fires hot-lead alert).
        void supabase.functions.invoke("classify-lead", { body: { leadId: lead.id } }).catch(() => undefined);

        // Charge credits for a connected call (VocalMax: any call > 0s is charged).
        const startTs = (call as { start_timestamp?: number }).start_timestamp;
        const endTs = (call as { end_timestamp?: number }).end_timestamp;
        if (startTs && endTs && endTs > startTs) {
          void chargeForCall((endTs - startTs) / 60000, {
            leadName: lead.name,
            campaignId: campaign.campaign_id,
          }).catch(() => undefined);
        }
      } else {
        inFlight++; // still ongoing/dialing/registered
      }
    } catch {
      inFlight++; // couldn't read — assume still in flight
    }
  }

  // 2. Fill free slots.
  const concurrency = campaign.concurrency ?? 10;
  const freeSlots = concurrency - inFlight;
  if (freeSlots > 0) {
    const now = Date.now();
    const retryDue = leads.filter(
      (l) =>
        (l.status === "failed" || l.status === "no-answer") &&
        (l.attempt_count ?? 0) < maxAttempts &&
        l.next_retry_at != null &&
        new Date(l.next_retry_at).getTime() <= now,
    );
    const pending = leads.filter((l) => l.status === "pending");
    const queue = [...retryDue, ...pending].slice(0, freeSlots);
    if (queue.length > 0) {
      // Credit gate — VocalMax pauses the campaign when out of credits.
      if ((await getCredits()) <= 0) {
        deps.log("[BLOCKED] Out of credits — pausing campaign.", "error");
        await updateCampaign(campaignId, { status: "paused", paused_reason: "out_of_credits" });
        return;
      }
      deps.log(`[BATCH] Dispatching ${queue.length} call(s) (slots: ${freeSlots}).`, "info");
      for (const lead of queue) {
        await dispatchCall(campaign, agent, lead, deps);
      }
    }
  }

  // 3. Completion check.
  const done = leads.filter(
    (l) =>
      l.status === "completed" ||
      l.status === "unresponsive" ||
      l.status === "dnc" ||
      ((l.status === "failed" || l.status === "no-answer") &&
        (l.attempt_count ?? 0) >= maxAttempts),
  ).length;
  if ((campaign.total_leads ?? leads.length) > 0 && done >= (campaign.total_leads ?? leads.length)) {
    await updateCampaign(campaignId, { status: "completed" });
    deps.log(`Campaign completed (${done}/${campaign.total_leads} leads done).`, "success");
  }
}

// React hook: runs the scheduler while mounted and exposes the log stream.
export function useDialer(
  campaignId: string | undefined,
  opts: { callingHours?: CallingHours | null; dnc?: Set<string>; onChange?: () => void },
) {
  const [logs, setLogs] = useState<DialerLog[]>([]);
  const runningRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const log = useCallback((msg: string, type: DialerLogType = "info") => {
    setLogs((prev) => {
      const next = [...prev, { time: hhmmss(), msg, type }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    let stopped = false;
    const tick = async () => {
      if (runningRef.current || stopped) return;
      runningRef.current = true;
      try {
        await runTick(campaignId, {
          log,
          callingHours: optsRef.current.callingHours,
          dnc: optsRef.current.dnc,
        });
        optsRef.current.onChange?.();
      } catch (e) {
        log(`[ERR] ${e instanceof Error ? e.message : String(e)}`, "error");
      } finally {
        runningRef.current = false;
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [campaignId, log]);

  return { logs, clearLogs: () => setLogs([]) };
}
