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

const calls = [
  { id: "c1", retell_call_id: "r1", to_number: "+447700900123", from_number: "+447915903057",
    status: "ended", duration_ms: 84000, cost_cents: 17, agent_name: "Campaign Agent",
    lead_name: "Jane Doe", summary: "Asked about pricing.", transcript: "Agent: Hello.",
    recording_url: "https://example.com/r1.mp3", call_successful: true, campaign_id: "c1",
    created_at: "2026-11-16T10:00:00Z" },
  { id: "c2", retell_call_id: "r2", to_number: "+447700900456", from_number: "+447915903057",
    status: "not_connected", duration_ms: null, cost_cents: null, agent_name: "Campaign Agent",
    lead_name: "Sam Patel", summary: null, transcript: null, recording_url: null,
    call_successful: false, campaign_id: "c1", created_at: "2026-11-16T09:00:00Z" },
];
const listOutboundCalls = vi.fn(async () => calls);
vi.mock("@/services/callsService", () => ({ listOutboundCalls: () => listOutboundCalls() }));

const open = async () => {
  const { default: P } = await import("./OutboundCallsPage.tsx");
  return render(
    <MemoryRouter initialEntries={["/dashboard/calls"]}>
      <CallModeProvider><Routes><Route path="/dashboard/calls" element={<P />} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); listOutboundCalls.mockResolvedValue(calls); });

describe("the outbound call log", () => {
  it("lists the calls a campaign made", async () => {
    await open();
    expect(await screen.findByText("+447700900123")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  // These two columns were empty on every outbound call until the webhook
  // started writing them.
  it("shows how long each call ran", async () => {
    await open();
    expect(await screen.findByText("1:24")).toBeInTheDocument();
  });

  it("shows what each call cost", async () => {
    await open();
    await screen.findByText("+447700900123");
    // Appears twice: the row's own cost and the total spent.
    expect(screen.getAllByText("$0.17").length).toBeGreaterThan(0);
  });

  it("totals the spend and the average length across what is shown", async () => {
    await open();
    await screen.findByText("+447700900123");
    expect(screen.getAllByText("$0.17").length).toBe(2);
    expect(screen.getByText("1m 24s")).toBeInTheDocument();
  });

  it("counts only the calls that actually connected", async () => {
    await open();
    await screen.findByText("+447700900123");
    const connected = screen.getByText("Connected").parentElement;
    expect(within(connected!).getByText("1")).toBeInTheDocument();
  });

  it("search narrows by lead name", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Jane Doe");
    await user.type(screen.getByPlaceholderText(/search number, lead/i), "Sam");
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Patel")).toBeInTheDocument();
  });

  it("Details opens the recording and transcript", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Jane Doe");
    await user.click(screen.getAllByRole("button", { name: /details/i })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Agent: Hello/)).toBeInTheDocument();
    expect(dialog.querySelector("audio")).toHaveAttribute("src", "https://example.com/r1.mp3");
  });

  it("a call with no transcript still opens", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Sam Patel");
    await user.click(screen.getAllByRole("button", { name: /details/i })[1]);
    expect(await screen.findByText(/no transcript for this call/i)).toBeInTheDocument();
  });

  it("says the load failed rather than claiming there are no calls", async () => {
    listOutboundCalls.mockRejectedValue(new Error("Your session has expired."));
    await open();
    expect(await screen.findByText(/couldn't load your calls/i)).toBeInTheDocument();
    expect(screen.queryByText(/no outbound calls yet/i)).not.toBeInTheDocument();
  });

  it("explains the empty state", async () => {
    listOutboundCalls.mockResolvedValue([]);
    await open();
    expect(await screen.findByText(/no outbound calls yet/i)).toBeInTheDocument();
  });
});
