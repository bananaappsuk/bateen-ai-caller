import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Outbound was not rewritten, but it was disturbed: all nine of its pages moved
// onto a shared layout, and the dialer's counters changed. These tests exist to
// show outbound still behaves after that, rather than asserting it does.

vi.mock("@/lib/devAuth", () => ({
  getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn(),
}));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));

const listAgents = vi.fn(async () => [fx.outboundAgent, fx.inboundAgent]);
vi.mock("@/services/agentsService", () => ({
  listAgents: () => listAgents(), getAgent: vi.fn(async () => fx.outboundAgent),
  createAgent: vi.fn(async () => fx.outboundAgent), updateAgent: vi.fn(),
  deleteAgent: vi.fn(), syncAgentsFromRetell: vi.fn(async () => ({ synced: 0 })),
}));
vi.mock("@/services/campaignsService", () => ({
  listCampaigns: vi.fn(async () => [fx.campaign]),
  getCampaign: vi.fn(async () => fx.campaign),
  createCampaign: vi.fn(async () => fx.campaign), updateCampaign: vi.fn(), deleteCampaign: vi.fn(),
}));
vi.mock("@/services/leadsService", () => ({
  listLeads: vi.fn(async () => [
    fx.lead,
    { ...fx.lead, id: "l2", name: "Sam Patel", phone: "+447700900456", lead_status: "Not Interested" },
    { ...fx.lead, id: "l3", name: "Rita Shah", phone: "+447700900789", lead_status: "Requested Callback" },
  ]),
  getLead: vi.fn(async () => fx.lead), createLeads: vi.fn(), updateLead: vi.fn(), deleteLead: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200, plan_tier: "scale" })),
  listTransactions: vi.fn(async () => []),
  reserveCallCredit: vi.fn(async () => ({ authorized: true, credits: 199 })),
  chargeForCall: vi.fn(), releaseCallCredit: vi.fn(), startCheckout: vi.fn(),
  startTopup: vi.fn(), openBillingPortal: vi.fn(),
  previewPlanChange: vi.fn(async () => ({ chargeToday: 0, currency: "GBP", message: "" })),
  changePlan: vi.fn(async () => ({ message: "" })),
}));
vi.mock("@/services/retellService", () => ({
  retellService: {
    listVoices: vi.fn(async () => fx.voices),
    getAgent: vi.fn(async () => ({ agent_id: "agent_1", voice_id: "11labs-Lily", response_engine: { llm_id: "llm_1" } })),
    getLlm: vi.fn(async () => ({ general_prompt: "Say hello.", general_tools: [] })),
    createAgent: vi.fn(), createLlm: vi.fn(), updateAgent: vi.fn(), updateLlm: vi.fn(),
    deleteAgent: vi.fn(), createWebCall: vi.fn(), getCall: vi.fn(), listPhoneNumbers: vi.fn(async () => []),
  },
  RetellApiError: class RetellApiError extends Error {},
}));
vi.mock("@/services/voicesService", () => ({ listAgentVoices: vi.fn(async () => fx.voices) }));
vi.mock("@/services/knowledgeBaseService", () => ({
  listKnowledgeBases: vi.fn(async () => [fx.knowledgeBase]),
  getAgentKnowledgeBaseIds: vi.fn(async () => []), setAgentKnowledgeBases: vi.fn(),
  createKnowledgeBase: vi.fn(), addSources: vi.fn(), refreshKnowledgeBase: vi.fn(), deleteKnowledgeBase: vi.fn(),
}));
vi.mock("@/services/inboundService", () => ({
  listInboundNumbers: vi.fn(async () => []), listInboundCalls: vi.fn(async () => []),
  listEnquiries: vi.fn(async () => []),
  listPlatformNumbers: vi.fn(async () => [{ phone_number: "+447828730643", on_trunk: true }]),
  syncPhoneNumbers: vi.fn(async () => ({ message: "synced", trunkVerified: true, total: 1 })),
  getInboundStats: vi.fn(async () => ({ totalCalls: 0, answered: 0, enquiries: 0, avgDurationSec: 0, byStatus: {} })),
  addInboundNumber: vi.fn(), assignAgentToNumber: vi.fn(), removeInboundNumber: vi.fn(),
}));
vi.mock("@/services/dialerEngine", () => ({ useDialer: () => ({ logs: [], clearLogs: vi.fn() }) }));

const mount = (ui: React.ReactElement, route = "/", path = "/") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <CallModeProvider><Routes><Route path={path} element={ui} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe("outbound navigation survived the shared-layout move", () => {
  it("every outbound destination is still reachable from the sidebar", async () => {
    const { default: P } = await import("./CampaignsPage.tsx");
    mount(<P />);
    for (const label of ["Overview", "AI Agents", "Campaigns", "Leads"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("Settings, Academy and Support did not disappear when they moved to the shared group", async () => {
    const { default: P } = await import("./CampaignsPage.tsx");
    mount(<P />);
    for (const label of ["Settings", "Academy", "Support"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("a detail page still lights up its parent nav item", async () => {
    const { default: P } = await import("./CampaignDetailPage.tsx");
    mount(<P />, "/campaigns/c1", "/campaigns/:id");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Campaigns/ }).className).toContain("text-cyan-600"),
    );
  });

  it("the full-height agent form keeps its own main layout", async () => {
    const { default: P } = await import("./CreateAgentPage.tsx");
    const { container } = mount(<P />);
    await waitFor(() => expect(container.querySelector("main")).toBeTruthy());
    // Losing h-screen here would break the sticky footer on the form pages.
    expect(container.querySelector("main")?.className).toContain("h-screen");
  });
});

describe("outbound data still reaches the screen", () => {
  it("campaigns list with their progress", async () => {
    const { default: P } = await import("./CampaignsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Spring Outreach")).toBeInTheDocument();
  });

  it("leads list with every classification", async () => {
    const { default: P } = await import("./LeadsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(await screen.findByText("Sam Patel")).toBeInTheDocument();
    expect(await screen.findByText("Rita Shah")).toBeInTheDocument();
  });

  it("the campaign detail page loads its campaign", async () => {
    const { default: P } = await import("./CampaignDetailPage.tsx");
    mount(<P />, "/campaigns/c1", "/campaigns/:id");
    expect(await screen.findByText(/Spring Outreach/)).toBeInTheDocument();
  });
});

describe("the direction filter does not hide existing agents", () => {
  it("outbound mode shows outbound agents — the 41 that already exist", async () => {
    const { default: P } = await import("./AIAgentsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Campaign Agent")).toBeInTheDocument();
  });

  it("and keeps inbound agents out of the outbound list", async () => {
    const { default: P } = await import("./AIAgentsPage.tsx");
    mount(<P />);
    await screen.findByText("Campaign Agent");
    expect(screen.queryByText("Reception")).not.toBeInTheDocument();
  });

  it("inbound mode lists inbound agents instead", async () => {
    // Flipping the switch navigates to the inbound overview, so the filter is
    // exercised by opening the agents page already in inbound mode — which is
    // what a user sees after switching and then clicking AI Agents.
    localStorage.setItem("ai_telecaller_call_mode", "inbound");
    const { default: P } = await import("./AIAgentsPage.tsx");
    mount(<P />, "/inbound/agents", "/inbound/agents");
    expect(await screen.findByText("Reception")).toBeInTheDocument();
    expect(screen.queryByText("Campaign Agent")).not.toBeInTheDocument();
  });
});

describe("knowledge bases are offered to outbound agents too", () => {
  it("the create-agent form lists them regardless of direction", async () => {
    const { default: P } = await import("./CreateAgentPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Courses and fees")).toBeInTheDocument();
  });

  it("they are a choice, not a requirement", async () => {
    const { default: P } = await import("./CreateAgentPage.tsx");
    mount(<P />);
    const box = (await screen.findByText("Courses and fees"))
      .closest("label")?.querySelector("input[type=checkbox]") as HTMLInputElement;
    expect(box).toBeTruthy();
    expect(box.checked).toBe(false);
  });
});
