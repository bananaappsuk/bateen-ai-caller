// Campaigns data-access layer (Supabase). The campaign row holds the dialer
// config (concurrency, retry policy, qualification criteria) and live counters.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
