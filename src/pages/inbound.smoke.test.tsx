import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";

// Smoke tests: compiling is not the same as running. These mount each new
// screen with its data layer stubbed, so a missing provider, a bad import or a
// render-time crash fails here rather than in the browser.

vi.mock("@/lib/devAuth", () => ({
  getDevUser: () => ({ id: "u1", email: "ravi@example.com", name: "Ravi", initials: "RA", role: "admin" }),
  canAccessRoute: () => true,
  devSignOut: vi.fn(),
}));

vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 1234, refresh: vi.fn() }),
}));

vi.mock("@/services/inboundService", () => ({
  getInboundStats: vi.fn(async () => ({
    totalCalls: 2,
    answered: 2,
    enquiries: 1,
    avgDurationSec: 99,
    byStatus: { ended: 2 },
  })),
  listInboundCalls: vi.fn(async () => [
    {
      id: "c1",
      retell_call_id: "call_1",
      from_number: "+447700900123",
      to_number: "+447700900500",
      status: "ended",
      duration_ms: 138000,
      summary: "Asked about course fees.",
      transcript: "Agent: hello",
      recording_url: null,
      agent_name: "Reception",
      lead_name: "Test caller",
      created_at: new Date().toISOString(),
    },
  ]),
  listEnquiries: vi.fn(async () => [
    {
      id: "e1",
      name: "Test caller",
      phone: "+447700900123",
      lead_status: "Interested",
      sentiment: "Positive",
      summary: "Asked about course fees.",
      transcript: "Agent: hello",
      created_at: new Date().toISOString(),
    },
  ]),
  listInboundNumbers: vi.fn(async () => [
    { id: "n1", phone_number: "+447700900500", agent_id: "a1", label: "Enquiry line", created_at: "", agent: { id: "a1", name: "Reception" } },
  ]),
  addInboundNumber: vi.fn(),
  assignAgentToNumber: vi.fn(),
  removeInboundNumber: vi.fn(),
}));

vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [{ id: "a1", name: "Reception", direction: "inbound" }]),
}));

vi.mock("@/services/knowledgeBaseService", () => ({
  listKnowledgeBases: vi.fn(async () => [
    {
      id: "k1",
      retell_kb_id: "knowledge_base_1",
      name: "Courses and fees",
      status: "complete",
      source_count: 3,
      auto_refresh: true,
      created_at: new Date().toISOString(),
      sources: [{ source_id: "s1", type: "url", title: "Courses" }],
    },
  ]),
  createKnowledgeBase: vi.fn(),
  deleteKnowledgeBase: vi.fn(),
  refreshKnowledgeBase: vi.fn(),
}));

const mount = async (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <CallModeProvider>{ui}</CallModeProvider>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe("inbound and knowledge base screens render", () => {
  it("Inbound Overview shows its figures", async () => {
    const { default: Page } = await import("./InboundOverviewPage");
    await mount(<Page />);
    expect(await screen.findByText("Inbound Overview")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Calls received")).toBeInTheDocument());
    expect(screen.getByText("Enquiries captured")).toBeInTheDocument();
  });

  it("Inbound Calls lists a call", async () => {
    const { default: Page } = await import("./InboundCallsPage");
    await mount(<Page />);
    expect(await screen.findByText("Inbound Calls")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Test caller")).toBeInTheDocument());
  });

  it("Enquiries lists an enquiry with its classification", async () => {
    const { default: Page } = await import("./InboundEnquiriesPage");
    await mount(<Page />);
    expect(await screen.findByText("Enquiries")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("+447700900123")).toBeInTheDocument());
    expect(screen.getAllByText("Interested").length).toBeGreaterThan(0);
  });

  it("Inbound Numbers lists a mapped number", async () => {
    const { default: Page } = await import("./InboundNumbersPage");
    await mount(<Page />);
    expect(await screen.findByText("Inbound Numbers")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("+447700900500")).toBeInTheDocument());
  });

  it("Knowledge Base lists a base and its sources", async () => {
    const { default: Page } = await import("./KnowledgeBasePage");
    await mount(<Page />);
    // "Knowledge Base" is also a sidebar link, so match the page heading.
    expect(await screen.findByRole("heading", { name: "Knowledge Base" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Courses and fees")).toBeInTheDocument());
    expect(screen.getByText(/3 sources/)).toBeInTheDocument();
  });
});
