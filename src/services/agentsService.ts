// Agents data-access layer (Supabase) + sync from the user's Retell account.
// The dialer resolves each campaign's agent to a retell_agent_id + phone_number
// from here.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { retellService } from "./retellService";

export type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];

export async function listAgents(): Promise<AgentRow[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAgent(id: string): Promise<AgentRow | null> {
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAgent(input: AgentInsert): Promise<AgentRow> {
  const { data, error } = await supabase.from("agents").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateAgent(id: string, patch: Partial<AgentInsert>): Promise<void> {
  const { error } = await supabase.from("agents").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

export interface PhoneNumberLinkStatus {
  phone_number: string;
  agent_id: string;
  agent_name: string;
  has_active_campaign: boolean;
}

// Numbers are a shared pool across every tenant, not per-user — this reads
// (name only, via a SECURITY DEFINER RPC) which agent currently holds each
// number and whether it's mid-campaign, regardless of who owns that agent.
export async function getPhoneNumberLinkStatus(numbers: string[]): Promise<PhoneNumberLinkStatus[]> {
  if (numbers.length === 0) return [];
  const { data, error } = await supabase.rpc("phone_number_link_status", { numbers });
  if (error) throw error;
  return data ?? [];
}

// Pull the user's Retell agents into the local `agents` table (matched by
// retell_agent_id), mapping each one's outbound caller-ID from Retell's
// list-phone-numbers. Mirrors VocalMax's agent sync.
export async function syncAgentsFromRetell(): Promise<{ synced: number }> {
  const [retellAgents, phoneNumbers] = await Promise.all([
    retellService.listAgents(),
    retellService.listPhoneNumbers().catch(() => []),
  ]);

  const phoneByAgent = new Map<string, string>();
  for (const pn of phoneNumbers) {
    for (const b of pn.outbound_agents ?? []) {
      if (b.agent_id) phoneByAgent.set(b.agent_id, pn.phone_number);
    }
    for (const b of pn.inbound_agents ?? []) {
      if (b.agent_id && !phoneByAgent.has(b.agent_id)) phoneByAgent.set(b.agent_id, pn.phone_number);
    }
  }

  const existing = await listAgents();
  const byRetellId = new Map(
    existing.filter((a) => a.retell_agent_id).map((a) => [a.retell_agent_id as string, a]),
  );

  let synced = 0;
  for (const ra of retellAgents) {
    const row: AgentInsert = {
      retell_agent_id: ra.agent_id,
      retell_agent_version: typeof ra.version === "number" ? ra.version : null,
      name: ra.agent_name ?? "Untitled agent",
      retell_voice_id: (ra.voice_id as string | undefined) ?? null,
      phone_number: phoneByAgent.get(ra.agent_id) ?? null,
      status: "active",
      deleted_in_retell: false,
    };
    const cur = byRetellId.get(ra.agent_id);
    try {
      if (cur) {
        await updateAgent(cur.id, row);
      } else {
        await createAgent(row);
      }
      synced++;
    } catch {
      // Retell is a shared account across tenants — an agent belonging to
      // another user (or a phone number they hold) will conflict here. Skip
      // it and keep syncing the rest instead of aborting the whole pass.
    }
  }
  return { synced };
}
