import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
// What the account owns. +447700900123 is already set up, so it must not be
// offered again; +447414227571 is ours but not on the trunk, so it can never
// receive a call and must not be selectable.
const platformNumbers = [
  { phone_number: "+447700900123", on_trunk: true },
  { phone_number: "+447828730643", on_trunk: true },
  { phone_number: "+447414227571", on_trunk: false },
];
const listPlatformNumbers = vi.fn(async () => platformNumbers);
const syncPhoneNumbers = vi.fn(async () => ({
  message: "14 numbers checked against the Twilio trunk.", trunkVerified: true, total: 14,
}));

vi.mock("@/services/inboundService", () => ({
  listInboundNumbers: () => listInboundNumbers(),
  addInboundNumber: (p: string, l?: string) => addInboundNumber(p, l),
  removeInboundNumber: (id: string) => removeInboundNumber(id),
  assignAgentToNumber: (id: string, a: string | null) => assignAgentToNumber(id, a),
  listPlatformNumbers: () => listPlatformNumbers(),
  syncPhoneNumbers: () => syncPhoneNumbers(),
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
  listPlatformNumbers.mockResolvedValue(platformNumbers);
});

/** Picks a number from the dialog's dropdown, the only way to supply one now. */
const chooseNumber = async (user: ReturnType<typeof userEvent.setup>, value: string) => {
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: new RegExp(value.replace("+", "\\+")) }));
};

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
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it("keeps Add disabled until a number is chosen", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    const add = screen.getByRole("button", { name: /^add$/i });
    expect(add).toBeDisabled();
    await chooseNumber(user, "+447828730643");
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
  it("saves exactly the number that was chosen", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await chooseNumber(user, "+447828730643");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(addInboundNumber).toHaveBeenCalledWith("+447828730643", ""));
  });

  it("passes the label through", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await chooseNumber(user, "+447828730643");
    await user.type(screen.getByLabelText(/label/i), "  Reception  ");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(addInboundNumber).toHaveBeenCalledWith("+447828730643", "Reception"));
  });

  it("confirms, closes and reloads the list on success", async () => {
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await chooseNumber(user, "+447828730643");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("+447828730643 added."));
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
    await chooseNumber(user, "+447828730643");
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
    await chooseNumber(user, "+447828730643");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("That number is already set up."));
  });

  it("leaves the dialog open on failure so the choice is not lost", async () => {
    addInboundNumber.mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    await mount();
    await openAddDialog(user);
    await chooseNumber(user, "+447828730643");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("+447828730643");
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

describe("the picker only offers numbers a call can actually reach", () => {
  // The whole reason this replaced a free-text box: a number can be ours,
  // registered with Retell, and still never ring, because what decides that is
  // whether Twilio has it on the SIP trunk. 12 of this account's 14 numbers are
  // in Retell but off the trunk.
  const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole("button", { name: /add number/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox"));
  };

  it("there is no free-text field to type an arbitrary number into", async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /add number/i }));
    await screen.findByRole("dialog");
    // Only the optional label remains typeable.
    expect(screen.queryByPlaceholderText(/07700 900123/)).not.toBeInTheDocument();
  });

  it("offers a number that is on the trunk", async () => {
    const user = userEvent.setup();
    await mount();
    await openPicker(user);
    expect(await screen.findByRole("option", { name: /\+447828730643/ })).toBeEnabled();
  });

  it("will not let a number off the trunk be chosen", async () => {
    const user = userEvent.setup();
    await mount();
    await openPicker(user);
    const dead = await screen.findByRole("option", { name: /\+447414227571/ });
    expect(dead).toHaveAttribute("aria-disabled", "true");
  });

  it("says why those ones cannot be used", async () => {
    const user = userEvent.setup();
    await mount();
    await openPicker(user);
    expect(screen.getByText(/not on your Twilio SIP trunk/i)).toBeInTheDocument();
  });

  it("does not offer a number that is already set up", async () => {
    const user = userEvent.setup();
    await mount();
    await openPicker(user);
    // +447700900123 is already in the list with an agent on it.
    expect(screen.queryByRole("option", { name: /\+447700900123/ })).not.toBeInTheDocument();
  });

  it("explains itself when every number is already in use", async () => {
    listPlatformNumbers.mockResolvedValue([{ phone_number: "+447700900123", on_trunk: true }]);
    const user = userEvent.setup();
    await mount();
    await openPicker(user);
    expect(await screen.findByText(/no numbers left to add/i)).toBeInTheDocument();
  });
});

describe("refreshing the list of numbers", () => {
  it("re-reads from Retell and Twilio, then reloads the picker", async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /add number/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /refresh list/i }));
    await waitFor(() => expect(syncPhoneNumbers).toHaveBeenCalled());
    await waitFor(() => expect(listPlatformNumbers).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith("14 numbers checked against the Twilio trunk."),
    );
  });

  it("reports a refresh failure instead of leaving a stale list looking current", async () => {
    syncPhoneNumbers.mockRejectedValue(new Error("Could not read your numbers from Retell (502)."));
    const user = userEvent.setup();
    await mount();
    await user.click(await screen.findByRole("button", { name: /add number/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /refresh list/i }));
    await waitFor(() =>
      expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/could not read your numbers/i)),
    );
  });
});
