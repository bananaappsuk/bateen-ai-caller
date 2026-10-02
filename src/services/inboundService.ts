// Inbound calling: numbers people ring, the calls that arrive, and the
// enquiries they turn into.
//
// Outbound leads always belong to a campaign; an inbound caller doesn't, so an
// enquiry is a lead with no campaign. Inbound calls are `calls` rows with
// direction "inbound", written by the retell-webhook when a call arrives.
import { supabase } from "@/integrations/supabase/client";
import { asError } from "@/lib/functionErrors";

export interface InboundNumber {
  id: string;
  phone_number: string;
  agent_id: string | null;
  label: string | null;
  created_at: string;
  agent?: { id: string; name: string } | null;
}

export interface InboundCall {
  id: string;
  retell_call_id: string | null;
  from_number: string | null;
  to_number: string | null;
  status: string | null;
  duration_ms: number | null;
  summary: string | null;
  transcript: string | null;
  recording_url: string | null;
  agent_name: string | null;
  lead_name: string | null;
  created_at: string;
}

export interface Enquiry {
  id: string;
  name: string | null;
  phone: string;
  lead_status: string | null;
  sentiment: string | null;
  summary: string | null;
  transcript: string | null;
  created_at: string;
}

export interface InboundStats {
  totalCalls: number;
  answered: number;
  enquiries: number;
  avgDurationSec: number;
  byStatus: Record<string, number>;
}

export async function listInboundNumbers(): Promise<InboundNumber[]> {
  const { data, error } = await supabase
    .from("inbound_numbers")
    .select("id, phone_number, agent_id, label, created_at, agent:agents(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as unknown as InboundNumber[];
}

export async function addInboundNumber(phone: string, label?: string): Promise<InboundNumber> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("inbound_numbers")
    .insert({ phone_number: phone, label: label || null, user_id: userId })
    .select("id, phone_number, agent_id, label, created_at")
    .single();
  if (error) throw asError(error);
  return data as unknown as InboundNumber;
}

// Both of these ask for the affected rows back, and treat "none" as a failure.
//
// An UPDATE or DELETE that matches no row is not an error to Postgres: it
// reports success having changed nothing. When this table was missing its
// DELETE policy, RLS filtered the row out, zero rows were deleted, and the API
// still answered 204 — so the page removed the number from the list and said
// "Number removed." while it sat in the database, still answering calls.
// Reading the rows back is what turns that silence into an error.
export async function assignAgentToNumber(numberId: string, agentId: string | null): Promise<void> {
  const { data, error } = await supabase
    .from("inbound_numbers")
    .update({ agent_id: agentId })
    .eq("id", numberId)
    .select("id");
  if (error) throw asError(error);
  if (!data || data.length === 0) throw new Error("That number no longer exists. Refresh the page.");
}

export async function removeInboundNumber(numberId: string): Promise<void> {
  const { data, error } = await supabase
    .from("inbound_numbers")
    .delete()
    .eq("id", numberId)
    .select("id");
  if (error) throw asError(error);
  if (!data || data.length === 0) throw new Error("That number could not be removed. Refresh the page and try again.");
}

export async function listInboundCalls(limit = 200): Promise<InboundCall[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, retell_call_id, from_number, to_number, status, duration_ms, summary, transcript, recording_url, agent_name, lead_name, created_at",
    )
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw asError(error);
  return (data ?? []) as unknown as InboundCall[];
}

/** Enquiries are leads with no campaign — i.e. someone who rang us. */
export async function listEnquiries(limit = 200): Promise<Enquiry[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, lead_status, sentiment, summary, transcript, created_at")
    .is("campaign_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw asError(error);
  return (data ?? []) as unknown as Enquiry[];
}

export async function getInboundStats(): Promise<InboundStats> {
  const [calls, enquiries] = await Promise.all([listInboundCalls(500), listEnquiries(500)]);
  const byStatus: Record<string, number> = {};
  let durationTotal = 0;
  let timed = 0;
  for (const c of calls) {
    const key = c.status ?? "unknown";
    byStatus[key] = (byStatus[key] ?? 0) + 1;
    if (c.duration_ms && c.duration_ms > 0) {
      durationTotal += c.duration_ms;
      timed += 1;
    }
  }
  // "Answered" means the call actually connected and ran, which is what
  // Retell reports as `ended` once a conversation has happened.
  const answered = calls.filter((c) => c.status === "ended" || (c.duration_ms ?? 0) > 0).length;
  return {
    totalCalls: calls.length,
    answered,
    enquiries: enquiries.length,
    avgDurationSec: timed ? Math.round(durationTotal / timed / 1000) : 0,
    byStatus,
  };
}
