/**
 * Retell AI service layer.
 *
 * All Retell API traffic from the browser is routed through the `retell`
 * edge function, which owns the RETELL_API_KEY. The frontend never sees
 * the API key.
 *
 * This module is a thin, typed wrapper over that proxy. UI components must
 * import from here — they must NOT call `fetch` or `supabase.functions.invoke`
 * for Retell directly.
 *
 * Extend this file as more Retell endpoints are needed; the callers should
 * not need to change when new endpoints are added.
 */
import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------

export type RetellVoiceId = string;
export type RetellAgentId = string;

export interface RetellAgent {
  agent_id: RetellAgentId;
  agent_name?: string;
  voice_id?: RetellVoiceId;
  language?: string;
  response_engine?: Record<string, unknown>;
  version?: number;
  last_modification_timestamp?: number;
  [key: string]: unknown;
}

export interface CreateAgentInput {
  agent_name?: string;
  voice_id: RetellVoiceId;
  language?: string;
  response_engine: Record<string, unknown>;
  // Any additional Retell-supported fields can be passed through.
  [key: string]: unknown;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

export interface WebCall {
  call_id: string;
  access_token: string;
  call_status?: string;
  agent_id?: RetellAgentId;
  agent_name?: string;
  [key: string]: unknown;
}

export interface CreateWebCallInput {
  agent_id: RetellAgentId;
  agent_version?: number;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

export interface RetellCall {
  call_id: string;
  call_status?: string;
  agent_id?: RetellAgentId;
  start_timestamp?: number;
  end_timestamp?: number;
  transcript?: string;
  recording_url?: string;
  [key: string]: unknown;
}

export class RetellApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "RetellApiError";
    this.status = status;
    this.details = details;
  }
}

// ---------- Internal proxy ----------

type ProxyBody = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

async function callRetell<T>(req: ProxyBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("retell", {
    body: req,
  });

  if (error) {
    // FunctionsHttpError from supabase-js does not automatically surface the
    // JSON body — try to extract it for a useful message.
    const anyErr = error as unknown as {
      message?: string;
      context?: { json?: () => Promise<{ error?: string; status?: number; details?: unknown }> };
    };
    let details: unknown;
    let status: number | undefined;
    let message = anyErr.message ?? "Retell request failed.";
    try {
      const parsed = await anyErr.context?.json?.();
      if (parsed) {
        message = parsed.error ?? message;
        status = parsed.status;
        details = parsed.details;
      }
    } catch {
      // ignore parse failures
    }
    throw new RetellApiError(message, status, details);
  }

  return data as T;
}

// ---------- LLMs ----------

export interface RetellLlm {
  llm_id: string;
  model?: string;
  general_prompt?: string;
  [key: string]: unknown;
}

export interface CreateLlmInput {
  model?: string;
  general_prompt: string;
  general_tools?: unknown[];
  [key: string]: unknown;
}

export function createLlm(input: CreateLlmInput): Promise<RetellLlm> {
  return callRetell<RetellLlm>({
    path: "/create-retell-llm",
    method: "POST",
    body: input,
  });
}

// ---------- Agents ----------

export function createAgent(input: CreateAgentInput): Promise<RetellAgent> {
  return callRetell<RetellAgent>({
    path: "/create-agent",
    method: "POST",
    body: input,
  });
}

export function getAgent(agentId: RetellAgentId): Promise<RetellAgent> {
  return callRetell<RetellAgent>({
    path: `/get-agent/${encodeURIComponent(agentId)}`,
    method: "GET",
  });
}

export function updateAgent(
  agentId: RetellAgentId,
  patch: UpdateAgentInput,
): Promise<RetellAgent> {
  return callRetell<RetellAgent>({
    path: `/update-agent/${encodeURIComponent(agentId)}`,
    method: "PATCH",
    body: patch,
  });
}

export function deleteAgent(agentId: RetellAgentId): Promise<void> {
  return callRetell<void>({
    path: `/delete-agent/${encodeURIComponent(agentId)}`,
    method: "DELETE",
  });
}

export function listAgents(): Promise<RetellAgent[]> {
  return callRetell<RetellAgent[]>({
    path: "/list-agents",
    method: "GET",
  });
}

// ---------- Web calls (browser test calls) ----------

export function createWebCall(input: CreateWebCallInput): Promise<WebCall> {
  return callRetell<WebCall>({
    path: "/create-web-call",
    method: "POST",
    body: input,
  });
}

// ---------- Phone / outbound calls (future) ----------

export interface CreatePhoneCallInput {
  from_number: string;
  to_number: string;
  override_agent_id?: RetellAgentId;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

export interface BatchCallTask {
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

export interface CreateBatchCallInput {
  from_number: string;
  tasks: BatchCallTask[];
  name?: string;
  trigger_timestamp?: number;
  override_agent_id?: RetellAgentId;
}

export interface BatchCall {
  batch_call_id: string;
  name?: string;
  from_number?: string;
  scheduled_timestamp?: number;
  total_task_count?: number;
  status?: string;
  [key: string]: unknown;
}

export function createBatchCall(input: CreateBatchCallInput): Promise<BatchCall> {
  return callRetell<BatchCall>({
    path: "/create-batch-call",
    method: "POST",
    body: input,
  });
}

export function createPhoneCall(input: CreatePhoneCallInput): Promise<RetellCall> {
  return callRetell<RetellCall>({
    path: "/create-phone-call",
    method: "POST",
    body: input,
  });
}

export function getCall(callId: string): Promise<RetellCall> {
  return callRetell<RetellCall>({
    path: `/get-call/${encodeURIComponent(callId)}`,
    method: "GET",
  });
}

export function listCalls(
  filters?: { agent_id?: RetellAgentId; limit?: number },
): Promise<RetellCall[]> {
  return callRetell<RetellCall[]>({
    path: "/list-calls",
    method: "POST",
    body: filters ?? {},
  });
}

// ---------- Grouped default export for ergonomic imports ----------

export const retellService = {
  createLlm,
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  listAgents,
  createWebCall,
  createPhoneCall,
  getCall,
  listCalls,
};

export default retellService;
