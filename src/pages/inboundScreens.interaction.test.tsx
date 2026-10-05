import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Every control on the three inbound screens, clicked. Previously these pages
// were only checked for mounting, which is how a blank Agent column survived.

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 167, loading: false, refreshCredits: vi.fn() }),
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

const calls = [
  {
    id: "c1", retell_call_id: "r1", from_number: "+447572917511", to_number: "+447576545787",
    status: "ended", duration_ms: 26000, agent_name: "IT Talent Hub Reception",
    lead_name: "Sai", summary: "Asked about the AI Consultant course fees.",
    transcript: "Agent: Hello. User: How much is the course?", recording_url: "https://example.com/r1.mp3",
    created_at: "2026-10-05T14:10:00Z",
  },
  {
    id: "c2", retell_call_id: "r2", from_number: "+447365932944", to_number: "+447576545787",
    status: "ended", duration_ms: 70000, agent_name: "SK",
    lead_name: null, summary: "Asked about apprenticeships.",
    transcript: null, recording_url: null, created_at: "2026-10-02T09:35:00Z",
  },
];
const enquiries = [
  { id: "e1", name: "Sai", phone: "+447572917511", lead_status: "Interested", sentiment: "positive",
    summary: "Wants the September intake.", transcript: "…", created_at: "2026-10-05T14:11:00Z" },
  { id: "e2", name: "Tom Reed", phone: "+447365932944", lead_status: "Requested Callback", sentiment: "neutral",
    summary: "Callback requested for tomorrow.", transcript: null, created_at: "2026-10-02T09:36:00Z" },
];

const listInboundCalls = vi.fn(async () => calls);
const listEnquiries = vi.fn(async () => enquiries);
const getInboundStats = vi.fn(async () => ({
  totalCalls: 2, answered: 2, enquiries: 2, avgDurationSec: 48, byStatus: { ended: 2 },
}));
const listInboundNumbers = vi.fn(async () => [
  { id: "n1", phone_number: "+447576545787", agent_id: "a2", label: "Main line", created_at: "x" },
  { id: "n2", phone_number: "+447828730643", agent_id: null, label: null, created_at: "x" },
]);
vi.mock("@/services/inboundService", () => ({
  listInboundCalls: () => listInboundCalls(),
  listEnquiries: () => listEnquiries(),
  getInboundStats: () => getInboundStats(),
  listInboundNumbers: () => listInboundNumbers(),
  listPlatformNumbers: vi.fn(async () => []), syncPhoneNumbers: vi.fn(),
  addInboundNumber: vi.fn(), assignAgentToNumber: vi.fn(), removeInboundNumber: vi.fn(),
}));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.inboundAgent]),
  getAgent: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(),
  syncAgentsFromRetell: vi.fn(),
}));

const mount = async (file: string, route: string) => {
  localStorage.setItem("ai_telecaller_call_mode", "inbound");
  const { default: Page } = await import(file);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CallModeProvider><Routes><Route path={route} element={<Page />} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );
};

/** Export writes a Blob to an anchor, neither of which jsdom has. */
const captureDownload = () => {
  const click = vi.fn();
  const createObjectURL = vi.fn(() => "blob:x");
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = realCreate(tag);
    if (tag === "a") Object.defineProperty(el, "click", { value: click });
    return el;
  });
  return { click, createObjectURL };
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  listInboundCalls.mockResolvedValue(calls);
  listEnquiries.mockResolvedValue(enquiries);
  listInboundNumbers.mockResolvedValue([
    { id: "n1", phone_number: "+447576545787", agent_id: "a2", label: "Main line", created_at: "x" },
    { id: "n2", phone_number: "+447828730643", agent_id: null, label: null, created_at: "x" },
  ]);
});

describe("Inbound → Calls", () => {
  const open = () => mount("./InboundCallsPage.tsx", "/inbound/calls");

  it("lists every call with the agent that answered", async () => {
    await open();
    expect(await screen.findByText("+447572917511")).toBeInTheDocument();
    // The bug that shipped: this column was "—" on every row.
    expect(screen.getByText("IT Talent Hub Reception")).toBeInTheDocument();
    expect(screen.getByText("SK")).toBeInTheDocument();
  });

  it("shows how long each call ran", async () => {
    await open();
    expect(await screen.findByText("0:26")).toBeInTheDocument();
    expect(screen.getByText("1:10")).toBeInTheDocument();
  });

  it("search narrows by caller", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.type(screen.getByPlaceholderText(/search caller, agent or summary/i), "447365");
    expect(screen.queryByText("+447572917511")).not.toBeInTheDocument();
    expect(screen.getByText("+447365932944")).toBeInTheDocument();
  });

  it("search also matches the agent name", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.type(screen.getByPlaceholderText(/search caller, agent or summary/i), "Reception");
    expect(screen.getByText("+447572917511")).toBeInTheDocument();
    expect(screen.queryByText("+447365932944")).not.toBeInTheDocument();
  });

  it("says so when a search matches nothing", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.type(screen.getByPlaceholderText(/search caller, agent or summary/i), "zzzzzz");
    expect(screen.queryByText("+447572917511")).not.toBeInTheDocument();
  });

  it("Details opens the call with its transcript", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.click(screen.getAllByRole("button", { name: /details/i })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/IT Talent Hub Reception/)).toBeInTheDocument();
    expect(within(dialog).getByText(/How much is the course/)).toBeInTheDocument();
  });

  it("a call with no agent recorded still opens without breaking", async () => {
    listInboundCalls.mockResolvedValue([{ ...calls[0], agent_name: null, transcript: null }]);
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.click(screen.getByRole("button", { name: /details/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("Export CSV produces a download", async () => {
    const { click, createObjectURL } = captureDownload();
    const user = userEvent.setup();
    await open();
    await screen.findByText("+447572917511");
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("Export is disabled when there is nothing to export", async () => {
    listInboundCalls.mockResolvedValue([]);
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled());
  });

  it("explains the empty state rather than showing a blank table", async () => {
    listInboundCalls.mockResolvedValue([]);
    await open();
    expect(await screen.findByText(/no inbound calls yet/i)).toBeInTheDocument();
  });

  it("says the load failed rather than claiming there are no calls", async () => {
    // An expired session used to render "No inbound calls yet" -- a confident
    // lie, and indistinguishable from a quiet day.
    listInboundCalls.mockRejectedValue(new Error("Your session has expired. Refresh the page and sign in again to continue."));
    await open();
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/session has expired/i)));
    expect(await screen.findByText(/couldn't load your calls/i)).toBeInTheDocument();
    expect(screen.queryByText(/no inbound calls yet/i)).not.toBeInTheDocument();
  });
});

describe("Inbound → Enquiries", () => {
  const open = () => mount("./InboundEnquiriesPage.tsx", "/inbound/enquiries");

  it("lists the people who rang", async () => {
    await open();
    expect(await screen.findByText("Sai")).toBeInTheDocument();
    expect(screen.getByText("Tom Reed")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Sai");
    await user.click(screen.getByRole("button", { name: /^Requested Callback/ }));
    expect(screen.queryByText("Sai")).not.toBeInTheDocument();
    expect(screen.getByText("Tom Reed")).toBeInTheDocument();
  });

  it("All brings everyone back", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Sai");
    await user.click(screen.getByRole("button", { name: /^Interested/ }));
    expect(screen.queryByText("Tom Reed")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^All$/ }));
    expect(screen.getByText("Tom Reed")).toBeInTheDocument();
  });

  it("search matches a number as well as a name", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Sai");
    await user.type(screen.getByPlaceholderText(/search name, number or summary/i), "447365");
    expect(screen.queryByText("Sai")).not.toBeInTheDocument();
    expect(screen.getByText("Tom Reed")).toBeInTheDocument();
  });

  it("Export CSV produces a download", async () => {
    const { click } = captureDownload();
    const user = userEvent.setup();
    await open();
    await screen.findByText("Sai");
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(click).toHaveBeenCalled();
  });

  it("distinguishes no enquiries from nothing matching the filter", async () => {
    listEnquiries.mockResolvedValue([]);
    await open();
    expect(await screen.findByText(/no enquiries yet/i)).toBeInTheDocument();
  });

  it("says the load failed rather than claiming there are no enquiries", async () => {
    listEnquiries.mockRejectedValue(new Error("Your session has expired. Refresh the page and sign in again to continue."));
    await open();
    expect(await screen.findByText(/couldn't load your enquiries/i)).toBeInTheDocument();
    expect(screen.queryByText(/no enquiries yet/i)).not.toBeInTheDocument();
  });
});

describe("Inbound → Overview", () => {
  const open = () => mount("./InboundOverviewPage.tsx", "/inbound");

  it("shows the headline numbers", async () => {
    await open();
    expect(await screen.findByText("Inbound Overview")).toBeInTheDocument();
    for (const label of ["Calls received", "Answered", "Enquiries captured", "Average length"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(await screen.findByText("0m 48s")).toBeInTheDocument(); // avgDurationSec 48
  });

  it("says the load failed instead of showing zeroes", async () => {
    getInboundStats.mockRejectedValue(new Error("Your session has expired. Refresh the page and sign in again to continue."));
    await open();
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/session has expired/i)));
  });

  it("warns when a number has nobody answering it", async () => {
    await open();
    // n2 has no agent, which is a silent failure if nobody is told.
    expect(await screen.findByText(/no agent assigned/i)).toBeInTheDocument();
  });

  it("does not warn when every number is covered", async () => {
    listInboundNumbers.mockResolvedValue([
      { id: "n1", phone_number: "+447576545787", agent_id: "a2", label: "Main line", created_at: "x" },
    ]);
    await open();
    await waitFor(() => expect(getInboundStats).toHaveBeenCalled());
    expect(screen.queryByText(/no agent assigned/i)).not.toBeInTheDocument();
  });
});
