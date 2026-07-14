// Leads data-access layer (Supabase). Backs the CSV upload, the dialer's per-lead
// state machine, and the Leads pages.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ParsedLead } from "./leadsCsv";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

// Dialer state machine (leads.status)
export type LeadStatus =
  | "pending"
  | "calling"
  | "completed"
  | "no-answer"
  | "failed"
  | "unresponsive"
  | "dnc";

// AI classification (leads.lead_status)
export type LeadClassification =
  | "Interested"
  | "Not Interested"
  | "Requested Callback"
  | "Voicemail"
  | "Reviewing";

export async function insertLeads(campaignId: string, leads: ParsedLead[]): Promise<number> {
  if (leads.length === 0) return 0;
  const rows: LeadInsert[] = leads.map((l) => ({
    campaign_id: campaignId,
    name: l.name,
    phone: l.phone,
    custom_data: l.customData,
    status: "pending",
  }));
  const { data, error } = await supabase.from("leads").insert(rows).select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function listLeads(campaignId?: string): Promise<LeadRow[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLead(id: string, patch: Partial<LeadInsert>): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteLeadsForCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("campaign_id", campaignId);
  if (error) throw error;
}
