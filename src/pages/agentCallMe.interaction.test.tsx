import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
const callMeFromAgent = vi.fn(async (_agent: unknown, _to: string) => ({ callId: "c1", fromNumber: "+447915903057" }));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.outboundAgent]),
  callMeFromAgent: (agent: unknown, to: string) => callMeFromAgent(agent, to),
  deleteAgent: vi.fn(), syncAgentsFromRetell: vi.fn(), getAgent: vi.fn(),
  createAgent: vi.fn(), updateAgent: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200 })), listTransactions: vi.fn(async () => []),
}));
vi.mock("@/services/retellService", () => ({
  retellService: { createWebCall: vi.fn(), deleteAgent: vi.fn(), listVoices: vi.fn(async () => fx.voices) },
  RetellApiError: class RetellApiError extends Error {},
}));

const open = async () => {
  const { default: P } = await import("./AIAgentsPage.tsx");
  return render(
    <MemoryRouter initialEntries={["/ai-agents"]}>
      <CallModeProvider><Routes><Route path="/ai-agents" element={<P />} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

describe("hearing an agent on a real phone", () => {
  it("every agent offers Call me", async () => {
    await open();
    await screen.findByText("Campaign Agent");
    expect(screen.getByRole("button", { name: /call me/i })).toBeInTheDocument();
  });

  it("rings the number given and names the caller id it dialled from", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /call me/i }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/your number/i), "07700900123");
    await user.click(screen.getByRole("button", { name: /^call me$/i }));
    await waitFor(() => expect(callMeFromAgent).toHaveBeenCalledWith(fx.outboundAgent, "07700900123"));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith(expect.stringMatching(/\+447915903057/)));
  });

  it("warns that it costs a credit", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /call me/i }));
    expect(await screen.findByText(/one calling credit/i)).toBeInTheDocument();
  });

  it("will not call with no number", async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /call me/i }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: /^call me$/i })).toBeDisabled();
  });

  it("surfaces a bad number instead of silently failing", async () => {
    callMeFromAgent.mockRejectedValue(new Error("Enter a valid UK number, e.g. 07700 900123."));
    const user = userEvent.setup();
    await open();
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /call me/i }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/your number/i), "12345");
    await user.click(screen.getByRole("button", { name: /^call me$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/valid UK number/i)));
  });
});
