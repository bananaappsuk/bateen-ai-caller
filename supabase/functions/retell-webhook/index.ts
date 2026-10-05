// Retell webhook receiver. Retell POSTs { event, call } for call_started /
// call_ended / call_analyzed. We log every delivery, enrich the lead + calls row
// with transcript / recording / summary / sentiment, finalize the lead's dialer
// status (so calls resolve even if no browser tab is running the dialer), and
// classify on call_analyzed.
//
// NOTE: signature verification is not yet enforced — add x-retell-signature HMAC
// verification before exposing this beyond trusted use.
import { adminClient, classifyAndNotify } from "../_shared/enrich.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retell-signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LeadStatus = "completed" | "no-answer" | "failed";

function mapEndedCallToStatus(call: { call_status?: string; disconnection_reason?: string }): LeadStatus {
  const reason = (call.disconnection_reason || "").toLowerCase();
  if (call.call_status === "not_connected") return "no-answer";
  if (
    reason.includes("permission_denied") ||
    reason.includes("failed") ||
    reason.includes("error") ||
    call.call_status === "error"
  ) return "failed";
  if (
    reason.includes("no_answer") ||
    reason.includes("busy") ||
    reason === "dial_no_answer" ||
    reason === "dial_busy"
  ) return "no-answer";
  return "completed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { event?: string; call?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const event = payload.event ?? "unknown";
  const call = (payload.call ?? {}) as Record<string, unknown>;
  const callId = (call.call_id as string) ?? null;
  const analysis = (call.call_analysis ?? {}) as Record<string, unknown>;
  const supabase = adminClient();

  await supabase.from("webhook_events").insert({
    retell_call_id: callId,
    event_type: event,
    payload: payload as unknown as Record<string, unknown>,
  });

  const metadata = (call.metadata ?? {}) as Record<string, unknown>;

  // ---- Inbound calls -------------------------------------------------------
  // An inbound caller has no campaign and no pre-created lead, so unlike an
  // outbound call there is nothing here to update: the call row and the enquiry
  // both have to be created from the webhook itself. `metadata.userId` is
  // stamped by the inbound-call function, which is what ties the call to a
  // tenant on a shared Retell account.
  const inboundUserId = metadata.direction === "inbound" ? (metadata.userId as string | undefined) : undefined;
  if (inboundUserId && callId) {
    const fromNumber = (call.from_number as string) ?? null;
    const startTs = call.start_timestamp as number | undefined;
    const endTs = call.end_timestamp as number | undefined;
    const durationMs = startTs && endTs && endTs > startTs ? endTs - startTs : null;

    // One row per call, created on call_started and filled in as it progresses.
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id")
      .eq("retell_call_id", callId)
      .maybeSingle();

    // Retell tells us which agent answered, but only by its own id. The call
    // log shows a name, so resolve it here: an outbound call gets `agent_name`
    // from the browser, which already knows the agent, while an inbound one is
    // created entirely from this webhook and has nothing but the Retell id.
    // Without this lookup the Agent column stays "—" on every inbound call.
    const retellAgentId = (call.agent_id as string) ?? null;
    let agentName: string | null = null;
    if (retellAgentId) {
      const { data: agentRow } = await supabase
        .from("agents")
        .select("name")
        .eq("retell_agent_id", retellAgentId)
        .eq("user_id", inboundUserId)
        .maybeSingle();
      agentName = (agentRow?.name as string | undefined) ?? null;
    }

    const callRow = {
      retell_call_id: callId,
      user_id: inboundUserId,
      direction: "inbound",
      call_type: "phone_call",
      from_number: fromNumber,
      to_number: (call.to_number as string) ?? null,
      agent_id: retellAgentId,
      // Only written once resolved, so a later event whose lookup comes back
      // empty cannot blank out a name an earlier event already stored.
      ...(agentName ? { agent_name: agentName } : {}),
      status: (call.call_status as string) ?? "registered",
      transcript: (call.transcript as string) ?? null,
      recording_url: (call.recording_url as string) ?? null,
      summary: (analysis.call_summary as string) ?? null,
      has_transcript: Boolean(call.transcript),
      duration_ms: durationMs,
    };
    if (existingCall) {
      await supabase.from("calls").update(callRow).eq("retell_call_id", callId);
    } else {
      await supabase.from("calls").insert(callRow);
    }

    // The enquiry: a lead with no campaign, matched on the caller's number so
    // someone who rings twice doesn't become two records.
    if (fromNumber) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", inboundUserId)
        .eq("phone", fromNumber)
        .is("campaign_id", null)
        .maybeSingle();

      const leadPatch: Record<string, unknown> = {
        retell_call_id: callId,
        called_at: new Date().toISOString(),
        status: event === "call_started" ? "calling" : "completed",
      };
      if (call.transcript) leadPatch.transcript = call.transcript;
      if (analysis.call_summary) leadPatch.summary = analysis.call_summary;
      if (analysis.user_sentiment) leadPatch.sentiment = analysis.user_sentiment;

      let inboundLeadId = existingLead?.id as string | undefined;
      if (inboundLeadId) {
        await supabase.from("leads").update(leadPatch).eq("id", inboundLeadId);
      } else {
        const { data: created } = await supabase
          .from("leads")
          .insert({ user_id: inboundUserId, phone: fromNumber, campaign_id: null, ...leadPatch })
          .select("id")
          .single();
        inboundLeadId = created?.id as string | undefined;
      }

      // Classify once the conversation is over, reusing the outbound pipeline so
      // an enquiry is labelled the same way a dialled lead is.
      if (inboundLeadId && (event === "call_ended" || event === "call_analyzed") && call.transcript) {
        void supabase.functions
          .invoke("classify-lead", { body: { leadId: inboundLeadId } })
          .catch(() => undefined);
      }
    }

    return json({ ok: true, inbound: true });
  }

  // ---- Outbound calls ------------------------------------------------------
  // Locate the lead (metadata.leadId first, then by retell_call_id).
  const leadId = metadata.leadId as string | undefined;
  let lead: Record<string, unknown> | null = null;
  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
    lead = data;
  }
  if (!lead && callId) {
    const { data } = await supabase.from("leads").select("*").eq("retell_call_id", callId).maybeSingle();
    lead = data;
  }

  // Enrich the calls row.
  if (callId) {
    await supabase
      .from("calls")
      .update({
        status: call.call_status as string,
        transcript: (call.transcript as string) ?? null,
        recording_url: (call.recording_url as string) ?? null,
        summary: (analysis.call_summary as string) ?? null,
        call_successful: (analysis.call_successful as boolean) ?? null,
        has_transcript: !!call.transcript,
      })
      .eq("retell_call_id", callId);
  }

  if (lead) {
    const patch: Record<string, unknown> = {};
    if (call.transcript) patch.transcript = call.transcript;
    if (analysis.call_summary) patch.summary = analysis.call_summary;
    if (analysis.user_sentiment) patch.sentiment = analysis.user_sentiment;

    // Finalize dialer status if the call ended while the lead is still "calling".
    const status = call.call_status as string | undefined;
    if ((event === "call_ended" || event === "call_analyzed") && lead.status === "calling") {
      const mapped = mapEndedCallToStatus(call);
      if (mapped === "completed") {
        patch.status = "completed";
        patch.next_retry_at = null;
      } else {
        // Let the dialer's own retry scheduling handle attempts; just record outcome.
        const attempts = (lead.attempt_count as number) ?? 1;
        const { data: c } = lead.campaign_id
          ? await supabase
              .from("campaigns")
              .select("max_attempts,retry_delay_minutes")
              .eq("campaign_id", lead.campaign_id as string)
              .maybeSingle()
          : { data: null };
        const maxAttempts = c?.max_attempts ?? 3;
        const retryDelay = c?.retry_delay_minutes ?? 60;
        if (attempts >= maxAttempts) {
          patch.status = "unresponsive";
          patch.unresponsive_at = new Date().toISOString();
          patch.next_retry_at = null;
        } else {
          patch.status = mapped;
          patch.next_retry_at = new Date(Date.now() + retryDelay * 60_000).toISOString();
        }
      }
      void status;
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from("leads").update(patch).eq("id", lead.id as string);
    }
    if (event === "call_analyzed") {
      await classifyAndNotify(supabase, lead.id as string);
    }
  }

  return json({ ok: true });
});
