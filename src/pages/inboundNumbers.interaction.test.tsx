import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Clicks, not mounts. The add/remove bug sat behind a dialog that no test ever
// opened, so "the page renders" passed while the feature was broken.

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));

const toasts = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: toasts }));

const numbers = [{ id: "n1", phone_number: "+447700900123", agent_id: null, label: "Main line", created_at: "2026-10-02T00:00:00Z" }];
const addInboundNumber = vi.fn();
const removeInboundNumber = vi.fn();
const assignAgentToNumber = vi.fn();
const listInboundNumbers = vi.fn(async () => numbers);

vi.mock("@/services/inboundService", () => ({
  listInboundNumbers: () => listInboundNumbers(),
  addInboundNumber: (p: string, l?: string) => addInboundNumber(p, l),
  removeInboundNumber: (id: string) => removeInboundNumber(id),
  assignAgentToNumber: (id: string, a: string | null) => assignAgentToNumber(id, a),
  listInboundCalls: vi.fn(async () => []),
  listEnquiries: vi.fn(async () => []),
  getInboundStats: vi.fn(async () => ({ totalCalls: 0, answered: 0, enquiries: 0, avgDurationSec: 0, byStatus: {} })),
}));
vi.mock("@/services/agentsService", () => ({
  listAgents: vi.fn(async () => [fx.inboundAgent]),
  getAgent: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(),
  syncAgentsFromRetell: vi.fn(async () => ({ synced: 0 })),
}));

const mount = async () => {
  localStorage.setItem("ai_telecaller_call_mode", "inbound");
  const { default: Page } = await import("./InboundNumbersPage.tsx");
  return render(
    <MemoryRouter initialEntries={["/inbound/numbers"]}>
      <CallModeProvider>
        <Routes><Route path="/inbound/numbers" element={<Page />} /></Routes>
      </CallModeProvider>
    </MemoryRouter>,
  );
};

const openAddDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: /add number/i }));
  return screen.findByRole("dialog");
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  addInboundNumber.mockResolvedValue({ id: "n2", phone_number: "+447572917511", agent_id: null, label: null, created_at: "x" });
  removeInboundNumber.mockResolvedValue(undefined);
  assignAgentToNumber.mockResolvedValue(undefined);
  listInboundNumbers.mockResolvedValue(numbers);
});

describe("the Add Number dialog", () => {
  it("is closed until the button is clicked", async () => {
    await mount();
    await screen.findByText("+447700900123");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on Add Number", async () => {
    const user = userEvent.setup();
    await mount();
    expect(await openAddDialog(user)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it("keeps Add disabled until a number is typed", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    const add = screen.getByRole("button", { name: /^add$/i });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText(/phone number/i), "07700900999");
    expect(add).toBeEnabled();
  });

  it("closes on Cancel without saving anything", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(addInboundNumber).not.toHaveBeenCalled();
  });
});

describe("adding a number", () => {
  it("rejects a non-UK number before calling the server", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "12345");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(addInboundNumber).not.toHaveBeenCalled();
    expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/valid UK number/i));
  });

  it("normalises a local format to E.164 before saving", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07572 917511");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(addInboundNumber).toHaveBeenCalledWith("+447572917511", ""));
  });

  it("passes the label through", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07572917511");
    await user.type(screen.getByLabelText(/label/i), "  Reception  ");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(addInboundNumber).toHaveBeenCalledWith("+447572917511", "Reception"));
  });

  it("confirms, closes and reloads the list on success", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07572917511");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("+447572917511 added."));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(listInboundNumbers).toHaveBeenCalledTimes(2); // initial load + reload
  });

  // This is the bug the user hit: a permission failure showed only as
  // "Could not add the number." because a PostgrestError is not an Error.
  it("shows the real reason when the server refuses, not a generic message", async () => {
    const { asError } = await import("@/lib/functionErrors");
    addInboundNumber.mockRejectedValue(
      asError({ message: 'new row violates row-level security policy for table "inbound_numbers"', code: "42501" }),
    );
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07572917511");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/do not have permission/i)));
    expect(toasts.error).not.toHaveBeenCalledWith("Could not add the number.");
  });

  it("words a duplicate number for a human", async () => {
    const { asError } = await import("@/lib/functionErrors");
    addInboundNumber.mockRejectedValue(asError({ message: "duplicate key value violates unique constraint", code: "23505" }));
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07700900123");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("That number is already set up."));
  });

  it("leaves the dialog open on failure so the typing is not lost", async () => {
    addInboundNumber.mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await user.type(screen.getByLabelText(/phone number/i), "07572917511");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toHaveValue("07572917511");
  });
});

describe("removing a number", () => {
  it("asks for confirmation first", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /remove \+447700900123/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Remove \+447700900123/));
    expect(removeInboundNumber).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("removes it once confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /remove \+447700900123/i }));
    await waitFor(() => expect(removeInboundNumber).toHaveBeenCalledWith("n1"));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Number removed."));
    confirm.mockRestore();
  });

  // The silent-delete trap: the row must stay on screen if the delete failed.
  it("does not claim success, or drop the row, when the delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    removeInboundNumber.mockRejectedValue(new Error("That number could not be removed. Refresh the page and try again."));
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /remove \+447700900123/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/could not be removed/i)));
    expect(toasts.success).not.toHaveBeenCalled();
    expect(screen.getByText("+447700900123")).toBeInTheDocument();
  });
});

describe("assigning an agent", () => {
  it("offers the inbound agents and saves the choice", async () => {
    const user = userEvent.setup();
    await mount();
    await screen.findByText("+447700900123");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Reception" }));
    await waitFor(() => expect(assignAgentToNumber).toHaveBeenCalledWith("n1", fx.inboundAgent.id));
  });

  it("surfaces a failure instead of appearing to save", async () => {
    assignAgentToNumber.mockRejectedValue(new Error("That number no longer exists. Refresh the page."));
    const user = userEvent.setup();
    await mount();
    await screen.findByText("+447700900123");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Reception" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/no longer exists/i)));
  });
});

describe("the empty state", () => {
  it("explains what to do when there are no numbers", async () => {
    listInboundNumbers.mockResolvedValue([]);
    await mount();
    expect(await screen.findByText("No inbound numbers")).toBeInTheDocument();
  });
});
