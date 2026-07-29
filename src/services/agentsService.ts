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

// Refresh the user's already-owned agents from Retell (name/voice/version).
// Retell's list-agents is a whole-account read (every tenant's agents, since
// Retell has no concept of this app's tenants) — this used to also CREATE a
// new local row for any Retell agent not yet known locally, which let one
// tenant's "sync" pull in and take local ownership of another tenant's
// actual Retell agent (a real cross-tenant leak: RLS hides other tenants'
// local rows from the `existing` lookup below, so a stranger's retell_agent_id
// looked "new" and got inserted under the syncing user's own user_id).
// Agents are only ever created going forward via CreateAgentPage, which mints
// a brand-new Retell agent_id at creation time — this only ever UPDATEs rows
// the caller already owns, never inserts.
// Phone-number binding is no longer read from here either: every agent
// automatically dials from the single platform Twilio number
// (src/lib/platformConfig.ts), not a per-agent Retell binding derived from
// list-phone-numbers.
export async function syncAgentsFromRetell(): Promise<{ synced: number }> {
  const retellAgents = await retellService.listAgents();

  const existing = await listAgents();
  const byRetellId = new Map(
    existing.filter((a) => a.retell_agent_id).map((a) => [a.retell_agent_id as string, a]),
  );

  let synced = 0;
  for (const ra of retellAgents) {
    const cur = byRetellId.get(ra.agent_id);
    if (!cur) continue; // not one of this tenant's agents — never claim it locally
    const row: Partial<AgentInsert> = {
      retell_agent_version: typeof ra.version === "number" ? ra.version : null,
      name: ra.agent_name ?? "Untitled agent",
      retell_voice_id: (ra.voice_id as string | undefined) ?? null,
      status: "active",
      deleted_in_retell: false,
    };
    try {
      await updateAgent(cur.id, row);
      synced++;
    } catch {
      // Best-effort refresh — keep syncing the rest.
    }
  }
  return { synced };
}
