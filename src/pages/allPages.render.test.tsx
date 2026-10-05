import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Every page in the app is mounted here against stubbed services. A build that
// compiles still crashes at runtime on a missing provider, a bad hook order or
// a null it didn't expect; this is the net for that. It proves the component
// trees hold together — not that the backend behaves.

vi.mock("@/lib/devAuth", () => ({
  getDevUser: () => fx.user,
  canAccessRoute: () => true,
  devSignOut: vi.fn(),
  signIn: vi.fn(async () => fx.user),
  signUp: vi.fn(async () => fx.user),
  sendPasswordReset: vi.fn(async () => true),
  updatePassword: vi.fn(async () => undefined),
}));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.outboundAgent, fx.inboundAgent]),
  getAgent: vi.fn(async () => fx.outboundAgent),
  createAgent: vi.fn(async () => fx.outboundAgent),
  updateAgent: vi.fn(async () => undefined),
  deleteAgent: vi.fn(async () => undefined),
  syncAgentsFromRetell: vi.fn(async () => ({ synced: 0 })),
}));
vi.mock("@/services/campaignsService", () => ({
  listCampaigns: vi.fn(async () => [fx.campaign]),
  getCampaign: vi.fn(async () => fx.campaign),
  createCampaign: vi.fn(async () => fx.campaign),
  updateCampaign: vi.fn(async () => undefined),
  deleteCampaign: vi.fn(async () => undefined),
}));
vi.mock("@/services/leadsService", () => ({
  listLeads: vi.fn(async () => [fx.lead]),
  getLead: vi.fn(async () => fx.lead),
  createLeads: vi.fn(async () => undefined),
  updateLead: vi.fn(async () => undefined),
  deleteLead: vi.fn(async () => undefined),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200, plan_tier: "scale" })),
  listTransactions: vi.fn(async () => []),
  reserveCallCredit: vi.fn(async () => ({ authorized: true, credits: 199 })),
  chargeForCall: vi.fn(async () => undefined),
  releaseCallCredit: vi.fn(async () => undefined),
  startCheckout: vi.fn(), startTopup: vi.fn(), openBillingPortal: vi.fn(),
  previewPlanChange: vi.fn(async () => ({ chargeToday: 0, currency: "GBP", message: "" })),
  changePlan: vi.fn(async () => ({ message: "" })),
}));
vi.mock("@/services/retellService", () => ({
  retellService: {
    listVoices: vi.fn(async () => fx.voices),
    getAgent: vi.fn(async () => ({ agent_id: "agent_1", voice_id: "11labs-Lily", response_engine: { llm_id: "llm_1" } })),
    getLlm: vi.fn(async () => ({ general_prompt: "Say hello.", general_tools: [] })),
    createAgent: vi.fn(), createLlm: vi.fn(), updateAgent: vi.fn(), updateLlm: vi.fn(),
    deleteAgent: vi.fn(), createWebCall: vi.fn(async () => ({ access_token: "t", call_id: "c" })),
    getCall: vi.fn(async () => ({})), listPhoneNumbers: vi.fn(async () => []),
  },
  RetellApiError: class RetellApiError extends Error {},
}));
vi.mock("@/services/voicesService", () => ({
  listAgentVoices: vi.fn(async () => fx.voices),
  cloneVoice: vi.fn(), listMyVoices: vi.fn(async () => []), removeMyVoice: vi.fn(),
}));
vi.mock("@/services/knowledgeBaseService", () => ({
  listKnowledgeBases: vi.fn(async () => [fx.knowledgeBase]),
  createKnowledgeBase: vi.fn(async () => ({ knowledge_base_id: "kb" })),
  addSources: vi.fn(), refreshKnowledgeBase: vi.fn(async () => "complete"),
  deleteKnowledgeBase: vi.fn(),
  getAgentKnowledgeBaseIds: vi.fn(async () => []),
  setAgentKnowledgeBases: vi.fn(async () => undefined),
}));
vi.mock("@/services/inboundService", () => ({
  listInboundNumbers: vi.fn(async () => [fx.inboundNumber]),
  addInboundNumber: vi.fn(), assignAgentToNumber: vi.fn(), removeInboundNumber: vi.fn(),
  listInboundCalls: vi.fn(async () => [fx.inboundCall]),
  listEnquiries: vi.fn(async () => [fx.enquiry]),
  listPlatformNumbers: vi.fn(async () => [{ phone_number: "+447828730643", on_trunk: true }]),
  syncPhoneNumbers: vi.fn(async () => ({ message: "synced", trunkVerified: true, total: 1 })),
  getInboundStats: vi.fn(async () => ({ totalCalls: 1, answered: 1, enquiries: 1, avgDurationSec: 36, byStatus: { ended: 1 } })),
}));
vi.mock("@/services/notificationSettingsService", () => ({
  getNotificationSettings: vi.fn(async () => ({ hot_lead_email: "ravi@example.com" })),
  saveNotificationSettings: vi.fn(),
}));
vi.mock("@/services/adminService", () => ({
  getPlatformStats: vi.fn(async () => ({ users: 1, campaigns: 1, calls: 1, agents: 1, credits: 200 })),
  listUsers: vi.fn(async () => []), adjustCredits: vi.fn(), setUserEnabled: vi.fn(),
  deleteUser: vi.fn(), getDemoConfig: vi.fn(async () => null), setDemoConfig: vi.fn(),
  listNumbers: vi.fn(async () => []), seedDemoData: vi.fn(),
}));
vi.mock("@/services/tenantsService", () => ({
  getMyTenant: vi.fn(async () => null), createTenant: vi.fn(), updateTenant: vi.fn(),
  listMembers: vi.fn(async () => []), addMember: vi.fn(), removeMember: vi.fn(),
}));
vi.mock("@/services/dialerEngine", () => ({ useDialer: () => ({ logs: [], clearLogs: vi.fn() }) }));

function mount(ui: React.ReactElement, route = "/", path = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CallModeProvider>
        <Routes><Route path={path} element={ui} /></Routes>
      </CallModeProvider>
    </MemoryRouter>,
  );
}

/** Pages reached with a URL parameter. */
const PARAM_ROUTES: Record<string, { path: string; route: string }> = {
  CampaignDetailPage: { path: "/campaigns/:id", route: "/campaigns/c1" },
  LeadDetailPage: { path: "/leads/:id", route: "/leads/l1" },
  EditAgentPage: { path: "/ai-agents/:id/edit", route: "/ai-agents/a1/edit" },
};

const DASHBOARD_PAGES = [
  "DashboardPage", "AIAgentsPage", "CreateAgentPage", "EditAgentPage",
  "CampaignsPage", "CreateCampaignPage", "CampaignDetailPage",
  "LeadsPage", "LeadDetailPage", "SettingsPage", "AcademyPage", "SupportPage",
  "ChoosePlanPage", "AdminPage", "TenantAdminPage",
  "KnowledgeBasePage", "InboundOverviewPage", "InboundNumbersPage",
  "InboundCallsPage", "InboundEnquiriesPage",
];

// Pages that render their own full-screen layout rather than the dashboard shell.
const STANDALONE_PAGES = ["OnboardingPage"];

const PUBLIC_PAGES = ["Index", "LoginPage", "SignupPage", "ResetPasswordPage", "ContactPage", "FAQPage", "TermsPage", "NotFound"];

describe("every page mounts without crashing", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each(DASHBOARD_PAGES)("%s renders", async (name) => {
    const mod = await import(`./${name}.tsx`);
    const Page = mod.default;
    const r = PARAM_ROUTES[name];
    const { container } = r ? mount(<Page />, r.route, r.path) : mount(<Page />);
    await waitFor(() => expect(container.firstChild).toBeTruthy());
    // The dashboard shell must be present, not just any markup.
    expect(container.querySelector("aside")).toBeTruthy();
  });

  it.each(STANDALONE_PAGES)("%s renders", async (name) => {
    const { default: Page } = await import(`./${name}.tsx`);
    const { container } = mount(<Page />);
    await waitFor(() => expect(container.firstChild).toBeTruthy());
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it.each(PUBLIC_PAGES)("%s renders", async (name) => {
    const mod = await import(`./${name}.tsx`);
    const Page = mod.default;
    const { container } = mount(<Page />);
    await waitFor(() => expect(container.firstChild).toBeTruthy());
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });
});

describe("pages show their own data, not an empty shell", () => {
  beforeEach(() => localStorage.clear());

  it("Campaigns lists a campaign", async () => {
    const { default: P } = await import("./CampaignsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Spring Outreach")).toBeInTheDocument();
  });

  it("Leads lists a lead with its AI outcome", async () => {
    const { default: P } = await import("./LeadsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getAllByText("Interested").length).toBeGreaterThan(0);
  });

  it("AI Agents shows outbound agents in outbound mode", async () => {
    const { default: P } = await import("./AIAgentsPage.tsx");
    mount(<P />);
    expect(await screen.findByText("Campaign Agent")).toBeInTheDocument();
    // The inbound agent belongs to the other mode and must stay hidden.
    expect(screen.queryByText("Reception")).not.toBeInTheDocument();
  });

  it("Knowledge Base lists a base with its source count", async () => {
    const { default: P } = await import("./KnowledgeBasePage.tsx");
    mount(<P />);
    expect(await screen.findByText("Courses and fees")).toBeInTheDocument();
    expect(screen.getByText(/3 sources/)).toBeInTheDocument();
  });

  it("Inbound Numbers lists the mapped number", async () => {
    const { default: P } = await import("./InboundNumbersPage.tsx");
    mount(<P />);
    expect(await screen.findByText("+447576545787")).toBeInTheDocument();
  });

  it("Inbound Calls lists a call", async () => {
    const { default: P } = await import("./InboundCallsPage.tsx");
    mount(<P />);
    expect(await screen.findAllByText("Caller")).not.toHaveLength(0);
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });

  it("Enquiries lists an enquiry", async () => {
    const { default: P } = await import("./InboundEnquiriesPage.tsx");
    mount(<P />);
    expect(await screen.findByText("+447700900123")).toBeInTheDocument();
  });
});
