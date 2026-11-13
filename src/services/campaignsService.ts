// Campaigns data-access layer (Supabase). The campaign row holds the dialer
// config (concurrency, retry policy, qualification criteria) and live counters.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getAgent, callMeFromAgent } from "./agentsService";
import { getBillingAccount } from "./creditsService";
import { asError } from "@/lib/functionErrors";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];

// VocalMax campaign lifecycle
export type CampaignStatus = "draft" | "running" | "paused" | "completed";

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw asError(error);
  return data ?? [];
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("campaign_id", id)
    .maybeSingle();
  if (error) throw asError(error);
  return data;
}

export async function createCampaign(input: CampaignInsert): Promise<CampaignRow> {
  const { data, error } = await supabase.from("campaigns").insert(input).select().single();
  if (error) throw asError(error);
  return data;
}

export async function updateCampaign(id: string, patch: Partial<CampaignInsert>): Promise<void> {
  const { error } = await supabase.from("campaigns").update(patch).eq("campaign_id", id);
  if (error) throw asError(error);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("campaign_id", id);
  if (error) throw asError(error);
}

export interface CampaignStartCheck {
  ok: boolean;
  reason?: string;
}

// Gate for starting/resuming a campaign (Start/Resume button in
// CampaignDetailPage). Every read here is RLS-scoped to the caller's own
// rows, so a lookup succeeding IS the ownership check — there is no separate
// "does this belong to me" query to write, a null/empty result means either
// "doesn't exist" or "isn't mine" and both are correctly treated as failure.
// The dialer (dialerEngine.ts) re-checks credits atomically before every
// individual call regardless — this is a fast, friendly fail at start time
// rather than only discovering the problem on the next 10s tick.
//
// Every agent automatically dials from the single platform Twilio number
// (src/lib/platformConfig.ts) — there's no per-user/per-agent number to
// check for here anymore, just that the agent itself is real and synced.
export async function canStartCampaign(campaign: CampaignRow): Promise<CampaignStartCheck> {
  if (!campaign.agent_id) return { ok: false, reason: "This campaign has no agent assigned." };

  const agent = await getAgent(campaign.agent_id);
  if (!agent) return { ok: false, reason: "Agent not found — it may not belong to your account." };
  if (!agent.retell_agent_id) return { ok: false, reason: "This agent isn't synced with Retell yet." };

  // No row yet means an untouched account, which is a zero balance rather than
  // a missing one — the server creates the row when the first call is reserved.
  // Saying "no billing account found" sent people to support over what is just
  // an empty wallet.
  const billing = await getBillingAccount();
  if ((billing?.credits ?? 0) <= 0) {
    return { ok: false, reason: "You have no calling credits remaining. Add credits to start this campaign." };
  }

  return { ok: true };
}

export type RerunScope = "all" | "no_answer" | "failed";

/** Lead statuses each scope puts back in the queue. */
const RERUN_STATUSES: Record<RerunScope, string[]> = {
  all: ["completed", "failed", "unresponsive", "no-answer"],
  no_answer: ["unresponsive", "no-answer"],
  failed: ["failed"],
};

/**
 * Puts finished leads back in the queue.
 *
 * The dialer only picks up pending, failed or no-answer leads under
 * max_attempts, so once everyone is completed, pressing Start dials nobody and
 * says nothing. Rerunning means resetting the leads, not restarting the
 * campaign. Never touches dnc.
 */
export async function rerunCampaign(
  campaignId: string,
  scope: RerunScope,
): Promise<{ reset: number }> {
  const { data, error } = await supabase
    .from("leads")
    .update({ status: "pending", attempt_count: 0, next_retry_at: null, unresponsive_at: null })
    .eq("campaign_id", campaignId)
    .in("status", RERUN_STATUSES[scope])
    .neq("status", "dnc")
    .select("id");
  if (error) throw asError(error);
  return { reset: data?.length ?? 0 };
}

/** How many leads each scope would re-dial, so the user sees it before agreeing. */
export async function countRerunnable(campaignId: string): Promise<Record<RerunScope, number>> {
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("campaign_id", campaignId);
  if (error) throw asError(error);
  const rows = data ?? [];
  const count = (scope: RerunScope) =>
    rows.filter((r) => RERUN_STATUSES[scope].includes(String(r.status))).length;
  return { all: count("all"), no_answer: count("no_answer"), failed: count("failed") };
}

/**
 * Dials one number with this campaign's agent, without touching its leads —
 * so the script can be heard before a list of real people is called.
 */
export async function testCampaignCall(
  campaign: CampaignRow,
  toNumber: string,
): Promise<{ callId: string; fromNumber: string }> {
  if (!campaign.agent_id) throw new Error("This campaign has no agent assigned.");
  const agent = await getAgent(campaign.agent_id);
  if (!agent) throw new Error("The campaign's agent no longer exists.");
  return callMeFromAgent(agent, toNumber);
}
