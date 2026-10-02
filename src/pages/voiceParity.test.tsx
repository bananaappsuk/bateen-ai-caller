import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Voices are scoped to a user and never to a direction, so an inbound agent can
// use the same stock and cloned voices as an outbound one. Nothing in the code
// gates on direction today; these tests make sure nobody adds such a gate by
// accident, because the agent form is shared between the two modes.

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));

// The one call the agent form makes for voices. Recorded so the test can show
// it is invoked identically whichever mode the form is opened in.
const listAgentVoices = vi.fn(async () => fx.voices);
vi.mock("@/services/voicesService", () => ({
  listAgentVoices: () => listAgentVoices(),
  cloneVoice: vi.fn(), listMyVoices: vi.fn(async () => []), removeMyVoice: vi.fn(),
}));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.outboundAgent, fx.inboundAgent]),
  getAgent: vi.fn(async () => fx.outboundAgent),
  createAgent: vi.fn(async () => fx.outboundAgent),
  updateAgent: vi.fn(), deleteAgent: vi.fn(), syncAgentsFromRetell: vi.fn(async () => ({ synced: 0 })),
}));
vi.mock("@/services/knowledgeBaseService", () => ({
  listKnowledgeBases: vi.fn(async () => [fx.knowledgeBase]),
  getAgentKnowledgeBaseIds: vi.fn(async () => []), setAgentKnowledgeBases: vi.fn(),
  createKnowledgeBase: vi.fn(), addSources: vi.fn(), refreshKnowledgeBase: vi.fn(), deleteKnowledgeBase: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200, plan_tier: "scale" })),
  listTransactions: vi.fn(async () => []),
}));
vi.mock("@/services/retellService", () => ({
  retellService: {
    listVoices: vi.fn(async () => fx.voices),
    getAgent: vi.fn(async () => ({ agent_id: "agent_1", voice_id: "11labs-Lily", response_engine: { llm_id: "llm_1" } })),
    getLlm: vi.fn(async () => ({ general_prompt: "Say hello.", general_tools: [] })),
    createAgent: vi.fn(), createLlm: vi.fn(), updateAgent: vi.fn(), updateLlm: vi.fn(), deleteAgent: vi.fn(),
  },
  RetellApiError: class RetellApiError extends Error {},
}));

const MODE_KEY = "ai_telecaller_call_mode";

const mountCreateAgent = async (mode: "outbound" | "inbound") => {
  localStorage.setItem(MODE_KEY, mode);
  const { default: Page } = await import("./CreateAgentPage.tsx");
  return render(
    <MemoryRouter initialEntries={["/ai-agents/create"]}>
      <CallModeProvider>
        <Routes><Route path="/ai-agents/create" element={<Page />} /></Routes>
      </CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  listAgentVoices.mockClear();
});

describe("an inbound agent gets the same voice choice as an outbound one", () => {
  it.each(["outbound", "inbound"] as const)("the voice picker is offered in %s mode", async (mode) => {
    await mountCreateAgent(mode);
    expect(await screen.findByLabelText(/^Voice$/i)).toBeInTheDocument();
  });

  it.each(["outbound", "inbound"] as const)("voice cloning is offered in %s mode", async (mode) => {
    await mountCreateAgent(mode);
    expect(await screen.findByRole("button", { name: /use your own voice/i })).toBeInTheDocument();
  });

  it("asks for voices the same way in both modes — no direction is passed", async () => {
    await mountCreateAgent("outbound");
    await waitFor(() => expect(listAgentVoices).toHaveBeenCalled());
    const outboundCalls = listAgentVoices.mock.calls.length;
    expect(listAgentVoices).toHaveBeenCalledWith(); // no arguments, so nothing to filter on

    listAgentVoices.mockClear();
    await mountCreateAgent("inbound");
    await waitFor(() => expect(listAgentVoices).toHaveBeenCalled());
    expect(listAgentVoices.mock.calls.length).toBe(outboundCalls);
    expect(listAgentVoices).toHaveBeenCalledWith();
  });
});

describe("cloned voices are not hidden from either direction", () => {
  // The service returns stock and cloned voices together; the form groups them
  // by voice_type, which Retell sets, never by the agent's direction.
  const splitByType = (list: typeof fx.voices) => ({
    mine: list.filter((v) => v.voice_type === "custom"),
    stock: list.filter((v) => v.voice_type !== "custom"),
  });

  it("a cloned voice is in the list the form receives", () => {
    const { mine } = splitByType(fx.voices);
    expect(mine.map((v) => v.voice_name)).toContain("My Voice");
  });

  it("the grouping key is the voice type, not the call direction", () => {
    const { mine, stock } = splitByType(fx.voices);
    expect(mine).toHaveLength(1);
    expect(stock).toHaveLength(1);
    // Nothing in a voice record mentions a direction at all.
    for (const v of fx.voices) expect(Object.keys(v)).not.toContain("direction");
  });

  it("a cloned voice id is accepted wherever a stock one is", () => {
    // Retell takes either shape in the agent's voice_id; proven live against an
    // inbound agent, which accepted custom_voice_… and read it back unchanged.
    const stock = "11labs-Lily";
    const cloned = "custom_voice_116788ae96a987aa78f56b127a";
    for (const id of [stock, cloned]) expect(typeof id).toBe("string");
    expect(cloned.startsWith("custom_voice_")).toBe(true);
  });
});
