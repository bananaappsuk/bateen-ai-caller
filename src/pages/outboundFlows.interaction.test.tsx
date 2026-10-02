import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// The outbound flow a customer actually spends money through: filter and export
// leads, delete a campaign, and start/pause dialling — including the credit
// check that must block a start rather than silently dial.

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));

const toasts = { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t") };
vi.mock("sonner", () => ({ toast: toasts }));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => navigate,
}));

const leads = [
  { ...fx.lead, id: "l1", name: "Jane Doe", phone: "+447700900123", lead_status: "Interested" },
  { ...fx.lead, id: "l2", name: "Sam Patel", phone: "+447700900456", lead_status: "Not Interested" },
  { ...fx.lead, id: "l3", name: "Rita Shah", phone: "+447700900789", lead_status: "Requested Callback" },
];
const listLeads = vi.fn(async () => leads);
vi.mock("@/services/leadsService", () => ({
  listLeads: () => listLeads(),
  getLead: vi.fn(async () => leads[0]),
  createLeads: vi.fn(), updateLead: vi.fn(), deleteLead: vi.fn(),
}));

const deleteCampaign = vi.fn();
const updateCampaign = vi.fn();
const canStartCampaign = vi.fn();
const listCampaigns = vi.fn(async () => [fx.campaign]);
vi.mock("@/services/campaignsService", () => ({
  listCampaigns: () => listCampaigns(),
  getCampaign: vi.fn(async () => fx.campaign),
  deleteCampaign: (id: string) => deleteCampaign(id),
  updateCampaign: (id: string, p: unknown) => updateCampaign(id, p),
  canStartCampaign: (c: unknown) => canStartCampaign(c),
  createCampaign: vi.fn(async () => fx.campaign),
}));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.outboundAgent]), getAgent: vi.fn(async () => fx.outboundAgent),
  createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(), syncAgentsFromRetell: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200, plan_tier: "scale" })),
  listTransactions: vi.fn(async () => []),
}));
vi.mock("@/services/dialerEngine", () => ({ useDialer: () => ({ logs: [], clearLogs: vi.fn() }) }));
vi.mock("@/services/notificationSettingsService", () => ({
  getNotificationSettings: vi.fn(async () => null), saveNotificationSettings: vi.fn(),
}));

const mount = async (file: string, route: string, path?: string) => {
  const { default: Page } = await import(file);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CallModeProvider><Routes><Route path={path ?? route} element={<Page />} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listLeads.mockResolvedValue(leads);
  listCampaigns.mockResolvedValue([fx.campaign]);
  deleteCampaign.mockResolvedValue(undefined);
  updateCampaign.mockResolvedValue(undefined);
  canStartCampaign.mockResolvedValue({ ok: true });
});

describe("filtering the leads list", () => {
  it("shows every lead under All", async () => {
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Sam Patel")).toBeInTheDocument();
    expect(screen.getByText("Rita Shah")).toBeInTheDocument();
  });

  it("narrows to one classification when its tab is clicked", async () => {
    const user = userEvent.setup();
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: "Interested" }));
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Sam Patel")).not.toBeInTheDocument();
    expect(screen.queryByText("Rita Shah")).not.toBeInTheDocument();
  });

  it("goes back to everything when All is clicked again", async () => {
    const user = userEvent.setup();
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: "Not Interested" }));
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Sam Patel")).toBeInTheDocument();
  });

  it("Refresh re-reads the list", async () => {
    const user = userEvent.setup();
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(listLeads).toHaveBeenCalledTimes(2));
  });

  it("opens a lead when its row is clicked", async () => {
    const user = userEvent.setup();
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    await user.click(await screen.findByText("Jane Doe"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard/leads/l1"));
  });
});

describe("exporting leads", () => {
  it("builds a download rather than failing silently", async () => {
    // Export writes a Blob to an anchor; jsdom has neither, so they are stubbed
    // and the test checks a download was actually triggered.
    const click = vi.fn();
    const createObjectURL = vi.fn(() => "blob:csv");
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") Object.defineProperty(el, "click", { value: click });
      return el;
    });

    const user = userEvent.setup();
    await mount("./LeadsPage.tsx", "/dashboard/leads");
    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    vi.mocked(document.createElement).mockRestore();
  });
});

describe("the campaigns list", () => {
  it("lists a campaign and opens it", async () => {
    const user = userEvent.setup();
    await mount("./CampaignsPage.tsx", "/dashboard/campaigns");
    await screen.findByText("Spring Outreach");
    await user.click(screen.getByRole("button", { name: /open/i }));
    expect(navigate).toHaveBeenCalledWith(`/dashboard/campaigns/${fx.campaign.campaign_id}`);
  });

  it("asks before deleting a campaign and its leads", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    await mount("./CampaignsPage.tsx", "/dashboard/campaigns");
    await screen.findByText("Spring Outreach");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(confirm).toHaveBeenCalledWith("Delete this campaign and all its leads?");
    expect(deleteCampaign).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("deletes once confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    await mount("./CampaignsPage.tsx", "/dashboard/campaigns");
    await screen.findByText("Spring Outreach");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith(fx.campaign.campaign_id));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Campaign deleted."));
    confirm.mockRestore();
  });

  it("reports a delete failure", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteCampaign.mockRejectedValue(new Error("Campaign is still running"));
    const user = userEvent.setup();
    await mount("./CampaignsPage.tsx", "/dashboard/campaigns");
    await screen.findByText("Spring Outreach");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Campaign is still running"));
  });
});

describe("starting and pausing a campaign", () => {
  // The shared fixture is already running, so Start only appears once the
  // campaign is a draft or paused — which is what canStart gates on.
  const openDetail = async (status = "draft") => {
    const { getCampaign } = await import("@/services/campaignsService");
    vi.mocked(getCampaign).mockResolvedValue({ ...fx.campaign, status } as never);
    return mount("./CampaignDetailPage.tsx", `/dashboard/campaigns/${fx.campaign.campaign_id}`, "/dashboard/campaigns/:id");
  };

  it("offers Start on a draft campaign", async () => {
    await openDetail();
    expect(await screen.findByRole("button", { name: /start campaign/i })).toBeInTheDocument();
  });

  it("starting checks the account first, then saves the running status", async () => {
    const user = userEvent.setup();
    await openDetail();
    await user.click(await screen.findByRole("button", { name: /start campaign/i }));
    await waitFor(() => expect(canStartCampaign).toHaveBeenCalled());
    await waitFor(() => expect(updateCampaign).toHaveBeenCalledWith(fx.campaign.campaign_id, expect.objectContaining({ status: "running" })));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Campaign started — dialing…"));
  });

  // The guard that matters: with no credits it must refuse, not dial anyway.
  it("refuses to start with no credits, and says why", async () => {
    canStartCampaign.mockResolvedValue({ ok: false, reason: "You have no calling credits remaining. Add credits to start this campaign." });
    const user = userEvent.setup();
    await openDetail();
    await user.click(await screen.findByRole("button", { name: /start campaign/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/no calling credits remaining/i)));
    expect(updateCampaign).not.toHaveBeenCalledWith(fx.campaign.campaign_id, expect.objectContaining({ status: "running" }));
  });

  it("a paused campaign offers Resume rather than Start", async () => {
    await openDetail("paused");
    expect(await screen.findByRole("button", { name: /resume campaign/i })).toBeInTheDocument();
  });

  it("a running campaign can be paused, and pausing needs no credit check", async () => {
    const user = userEvent.setup();
    await openDetail("running");
    await user.click(await screen.findByRole("button", { name: /pause/i }));
    await waitFor(() => expect(updateCampaign).toHaveBeenCalledWith(fx.campaign.campaign_id, expect.objectContaining({ status: "paused" })));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Campaign paused."));
    expect(canStartCampaign).not.toHaveBeenCalled();
  });
});
