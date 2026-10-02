// Knowledge bases — the facts an agent can look up while it's talking, as
// opposed to the script, which is how it talks. Both are sent to the same
// Retell LLM: the script as `general_prompt`, these as `knowledge_base_ids`.
//
// Listing goes through the list-knowledge-bases edge function rather than
// Retell directly: all tenants share one Retell account, so the raw list would
// expose everyone's knowledge bases.
import { supabase } from "@/integrations/supabase/client";
import { throwFunctionError, asError } from "@/lib/functionErrors";

export type KnowledgeBaseStatus = "in_progress" | "complete" | "error" | "refreshing_in_progress";

export interface KnowledgeBaseSource {
  source_id: string;
  type: string;
  title?: string;
  url?: string;
  filename?: string;
}

export interface KnowledgeBase {
  id: string;
  retell_kb_id: string;
  name: string;
  status: KnowledgeBaseStatus;
  source_count: number;
  auto_refresh: boolean;
  created_at: string;
  sources?: KnowledgeBaseSource[];
  /** True when the knowledge base was deleted directly in the Retell dashboard. */
  missing_upstream?: boolean;
}

export interface NewKnowledgeBaseInput {
  name: string;
  texts?: { title: string; text: string }[];
  urls?: string[];
  files?: File[];
  autoRefresh?: boolean;
}


function buildForm(action: string, input: Partial<NewKnowledgeBaseInput> & { kbId?: string }): FormData {
  const form = new FormData();
  form.append("action", action);
  if (input.kbId) form.append("kb_id", input.kbId);
  if (input.name) form.append("name", input.name);
  if (input.texts?.length) form.append("texts", JSON.stringify(input.texts));
  if (input.urls?.length) form.append("urls", JSON.stringify(input.urls));
  if (input.autoRefresh) form.append("auto_refresh", "true");
  for (const file of input.files ?? []) form.append("files", file, file.name);
  return form;
}

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  const { data, error } = await supabase.functions.invoke<KnowledgeBase[] | { error: string }>(
    "list-knowledge-bases",
    { body: {} },
  );
  if (error) await throwFunctionError(error, data, "Could not load knowledge bases.");
  if (!Array.isArray(data)) await throwFunctionError(null, data, "Could not load knowledge bases.");
  return data;
}

export async function createKnowledgeBase(input: NewKnowledgeBaseInput): Promise<{ knowledge_base_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ knowledge_base_id?: string; error?: string }>(
    "knowledge-base",
    { body: buildForm("create", input) },
  );
  if (error || !data?.knowledge_base_id) {
    await throwFunctionError(error, data, "Could not create the knowledge base.");
  }
  return { knowledge_base_id: data.knowledge_base_id };
}

export async function addSources(kbId: string, input: Omit<NewKnowledgeBaseInput, "name">): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>("knowledge-base", {
    body: buildForm("add-sources", { ...input, kbId }),
  });
  if (error || data?.error) await throwFunctionError(error, data, "Could not add sources.");
}

/** Pulls fresh indexing status from Retell, so the UI knows when to stop polling. */
export async function refreshKnowledgeBase(kbId: string): Promise<KnowledgeBaseStatus> {
  const { data, error } = await supabase.functions.invoke<{ status?: KnowledgeBaseStatus; error?: string }>(
    "knowledge-base",
    { body: { action: "refresh", kb_id: kbId } },
  );
  if (error || data?.error) await throwFunctionError(error, data, "Could not refresh.");
  return data?.status ?? "complete";
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>("knowledge-base", {
    body: { action: "delete", kb_id: kbId },
  });
  if (error || data?.error) await throwFunctionError(error, data, "Could not delete the knowledge base.");
}

/** Knowledge bases currently attached to an agent, as Retell knowledge base ids. */
export async function getAgentKnowledgeBaseIds(agentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("agent_knowledge_bases")
    .select("knowledge_bases(retell_kb_id)")
    .eq("agent_id", agentId);
  if (error) throw asError(error);
  return (data ?? [])
    .map((r) => (r.knowledge_bases as { retell_kb_id?: string } | null)?.retell_kb_id)
    .filter((v): v is string => Boolean(v));
}

/** Replaces an agent's knowledge base links with exactly `kbRowIds`. */
export async function setAgentKnowledgeBases(agentId: string, kbRowIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from("agent_knowledge_bases").delete().eq("agent_id", agentId);
  if (delErr) throw delErr;
  if (kbRowIds.length === 0) return;
  const { error } = await supabase
    .from("agent_knowledge_bases")
    .insert(kbRowIds.map((knowledge_base_id) => ({ agent_id: agentId, knowledge_base_id })));
  if (error) throw asError(error);
}
