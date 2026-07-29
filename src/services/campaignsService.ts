// Campaigns data-access layer (Supabase). The campaign row holds the dialer
// config (concurrency, retry policy, qualification criteria) and live counters.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getAgent } from "./agentsService";
import { getBillingAccount } from "./creditsService";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];

// VocalMax campaign lifecycle
export type CampaignStatus = "draft" | "running" | "paused" | "completed";

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("campaign_id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCampaign(input: CampaignInsert): Promise<CampaignRow> {
  const { data, error } = await supabase.from("campaigns").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, patch: Partial<CampaignInsert>): Promise<void> {
  const { error } = await supabase.from("campaigns").update(patch).eq("campaign_id", id);
  if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("campaign_id", id);
  if (error) throw error;
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

  const billing = await getBillingAccount();
  if (!billing) return { ok: false, reason: "No billing account found for your account." };
  if ((billing.credits ?? 0) <= 0) {
    return { ok: false, reason: "You have no calling credits remaining. Add credits to start this campaign." };
  }

  return { ok: true };
}
