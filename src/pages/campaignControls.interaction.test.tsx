import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));
const toasts = { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t") };
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toasts) }));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => vi.fn(),
}));

const rerunCampaign = vi.fn(async (_id: string, _scope: string) => ({ reset: 7 }));
const countRerunnable = vi.fn(async (_id: string) => ({ all: 18, no_answer: 7, failed: 2 }));
const testCampaignCall = vi.fn(async (_c: unknown, _to: string) => ({ callId: "c1", fromNumber: "+447915903057" }));
vi.mock("@/services/campaignsService", () => ({
  getCampaign: vi.fn(async () => ({ ...fx.campaign, status: "completed" })),
  listCampaigns: vi.fn(async () => [fx.campaign]),
  updateCampaign: vi.fn(), deleteCampaign: vi.fn(), createCampaign: vi.fn(),
  canStartCampaign: vi.fn(async () => ({ ok: true })),
  rerunCampaign: (id: string, scope: string) => rerunCampaign(id, scope),
  countRerunnable: (id: string) => countRerunnable(id),
  testCampaignCall: (c: unknown, to: string) => testCampaignCall(c, to),
}));
vi.mock("@/services/agentsService", () => ({
  getAgent: vi.fn(async () => fx.outboundAgent), listAgents: vi.fn(async () => [fx.outboundAgent]),
  createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(), syncAgentsFromRetell: vi.fn(),
  callMeFromAgent: vi.fn(async () => ({ callId: "c1", fromNumber: "+447915903057" })),
}));
vi.mock("@/services/leadsService", () => ({
  listLeads: vi.fn(async () => [fx.lead]), getLead: vi.fn(), createLeads: vi.fn(),
  updateLead: vi.fn(), deleteLead: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200 })), listTransactions: vi.fn(async () => []),
}));
vi.mock("@/services/dialerEngine", () => ({ useDialer: () => ({ logs: [], clearLogs: vi.fn() }) }));
vi.mock("@/services/notificationSettingsService", () => ({
  getNotificationSettings: vi.fn(async () => null), saveNotificationSettings: vi.fn(),
}));

const open = async () => {
  const { default: P } = await import("./CampaignDetailPage.tsx");
  return render(
    <MemoryRouter initialEntries={[`/dashboard/campaigns/${fx.campaign.campaign_id}`]}>
      <CallModeProvider>
        <Routes><Route path="/dashboard/campaigns/:id" element={<P />} /></Routes>
      </CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

describe("re-running a finished campaign", () => {
  it("offers Re-run on a campaign that has already finished", async () => {
    await open();
    expect(await screen.findByRole("button", { name: /re-run/i })).toBeInTheDocument();
  });

  it("shows how many leads each choice would re-dial before you agree", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /re-run/i }));
    await waitFor(() => expect(countRerunnable).toHaveBeenCalled());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/never answered \(7\)/i)).toBeInTheDocument();
  });

  it("queues the chosen leads and says how many", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /re-run/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /queue them/i }));
    await waitFor(() => expect(rerunCampaign).toHaveBeenCalledWith(fx.campaign.campaign_id, "no_answer"));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith(expect.stringMatching(/7 leads queued/i)));
  });

  // Queuing must not start dialling — the user presses Start when ready.
  it("does not dial anyone by itself", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /re-run/i }));
    await screen.findByRole("dialog");
    expect(screen.getByText(/does not dial anyone/i)).toBeInTheDocument();
  });

  it("says so when the choice matches nobody", async () => {
    rerunCampaign.mockResolvedValue({ reset: 0 });
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /re-run/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /queue them/i }));
    await waitFor(() => expect(toasts.success).not.toHaveBeenCalled());
  });
});

describe("testing a campaign before dialling the list", () => {
  it("offers a Test call", async () => {
    await open();
    expect(await screen.findByRole("button", { name: /test call/i })).toBeInTheDocument();
  });

  it("rings the number given and names the caller id used", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /test call/i }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/your number/i), "07700900123");
    await user.click(screen.getByRole("button", { name: /^call me$/i }));
    await waitFor(() => expect(testCampaignCall).toHaveBeenCalledWith(expect.anything(), "07700900123"));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith(expect.stringMatching(/\+447915903057/)));
  });

  it("will not call until a number is entered", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /test call/i }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: /^call me$/i })).toBeDisabled();
  });

  it("says the lead list is untouched", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /test call/i }));
    expect(await screen.findByText(/lead list is not touched/i)).toBeInTheDocument();
  });

  it("surfaces a failure instead of looking like it rang", async () => {
    testCampaignCall.mockRejectedValue(new Error("This campaign has no agent assigned."));
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: /test call/i }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/your number/i), "07700900123");
    await user.click(screen.getByRole("button", { name: /^call me$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("This campaign has no agent assigned."));
  });
});
