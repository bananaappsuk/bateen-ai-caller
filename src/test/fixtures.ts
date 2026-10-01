// Shared fixtures for page tests. The mock wiring itself lives in each test
// file, because vi.mock is hoisted per file and cannot be installed from here.

export const user = {
  id: "u-test", email: "ravi@example.com", name: "Ravi", initials: "RA", role: "admin",
};

export const outboundAgent = {
  id: "a1", name: "Campaign Agent", direction: "outbound", status: "active",
  retell_agent_id: "agent_1", retell_llm_id: "llm_1", retell_voice_id: "11labs-Lily",
  prompt: "Say hello.", language: "en-GB", metadata: {}, user_id: user.id,
  created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z",
  deleted_in_retell: false, error_message: null, llm: "gpt-4.1-mini",
  phone_number: null, retell_agent_version: 0, voice: null,
};

export const inboundAgent = { ...outboundAgent, id: "a2", name: "Reception", direction: "inbound", retell_agent_id: "agent_2" };

export const campaign = {
  campaign_id: "c1", name: "Spring Outreach", status: "running", total_leads: 18,
  called_leads: 18, failed_calls: 0, agent_id: "a1", concurrency: 10, max_attempts: 3,
  retry_delay_minutes: 60, created_at: "2026-09-01T10:00:00Z", user_id: user.id,
  paused_reason: null, country: "+44", updated_at: "2026-09-01T10:00:00Z",
};

export const lead = {
  id: "l1", name: "Jane Doe", phone: "+447700900123", status: "completed",
  lead_status: "Interested", sentiment: "Positive", summary: "Wants a callback.",
  transcript: "Agent: hello", campaign_id: "c1", attempt_count: 1,
  created_at: "2026-09-01T10:00:00Z", user_id: user.id, called_at: null,
  next_retry_at: null, unresponsive_at: null, retell_call_id: "call_1",
  custom_data: {}, updated_at: "2026-09-01T10:00:00Z",
};

export const knowledgeBase = {
  id: "k1", retell_kb_id: "knowledge_base_1", name: "Courses and fees",
  status: "complete", source_count: 3, auto_refresh: true,
  created_at: "2026-09-01T10:00:00Z",
  sources: [{ source_id: "s1", type: "url", title: "Courses" }],
};

export const voices = [
  { voice_id: "11labs-Lily", voice_name: "Lily", provider: "elevenlabs", voice_type: "standard", gender: "female" },
  { voice_id: "custom_voice_1", voice_name: "My Voice", provider: "platform", voice_type: "custom" },
];

export const inboundCall = {
  id: "ic1", retell_call_id: "call_x", from_number: "+447700900123",
  to_number: "+447576545787", status: "ended", duration_ms: 36000,
  summary: "Asked about fees.", transcript: "Agent: hi", recording_url: "https://x/r.mp3",
  agent_name: "Reception", lead_name: "Caller", created_at: "2026-10-01T17:19:21Z",
};

export const enquiry = {
  id: "e1", name: "Caller", phone: "+447700900123", lead_status: "Interested",
  sentiment: "Positive", summary: "Asked about fees.", transcript: "Agent: hi",
  created_at: "2026-10-01T17:19:21Z",
};

export const inboundNumber = {
  id: "n1", phone_number: "+447576545787", agent_id: "a2", label: "Main line",
  created_at: "2026-09-01T10:00:00Z", agent: { id: "a2", name: "Reception" },
};

/** A chainable supabase stub: any query builder chain resolves to `rows`. */
export function supabaseStub(rows: unknown[] = []) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","is","in","gte","lte","like","ilike","order","limit","range","not","or"]) {
    chain[m] = () => chain;
  }
  chain.single = async () => ({ data: rows[0] ?? null, error: null });
  chain.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
  chain.then = (res: (r: unknown) => unknown) => Promise.resolve({ data: rows, error: null, count: rows.length }).then(res);
  return {
    from: () => chain,
    auth: {
      getUser: async () => ({ data: { user: { id: user.id } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    functions: { invoke: async () => ({ data: [], error: null }) },
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  };
}
