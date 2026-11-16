import { supabase } from "@/integrations/supabase/client";
import { asError } from "@/lib/functionErrors";

export interface OutboundCall {
  id: string;
  retell_call_id: string | null;
  to_number: string | null;
  from_number: string | null;
  status: string | null;
  call_type: string | null;
  duration_ms: number | null;
  cost_cents: number | null;
  agent_name: string | null;
  lead_name: string | null;
  summary: string | null;
  transcript: string | null;
  recording_url: string | null;
  call_successful: boolean | null;
  campaign_id: string | null;
  created_at: string;
}

export async function listOutboundCalls(limit = 200): Promise<OutboundCall[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, retell_call_id, to_number, from_number, status, call_type, duration_ms, cost_cents, agent_name, lead_name, summary, transcript, recording_url, call_successful, campaign_id, created_at",
    )
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw asError(error);
  return (data ?? []) as unknown as OutboundCall[];
}
