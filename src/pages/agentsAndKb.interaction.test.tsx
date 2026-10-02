import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CallModeProvider } from "@/lib/callMode";
import * as fx from "@/test/fixtures";

// Agent and knowledge-base management, clicked through: the Edit/Test/Delete
// row on each agent card, and the create/add/refresh/delete actions on a
// knowledge base, including the confirmation prompts that guard the two
// destructive ones.

vi.mock("@/lib/devAuth", () => ({ getDevUser: () => fx.user, canAccessRoute: () => true, devSignOut: vi.fn() }));
vi.mock("@/lib/creditsContext", () => ({
  useCredits: () => ({ credits: 200, loading: false, refreshCredits: vi.fn() }),
  CreditsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: fx.supabaseStub([]) }));

const toasts = { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t1") };
vi.mock("sonner", () => ({ toast: toasts }));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => navigate,
}));

const deleteAgent = vi.fn();
const syncAgentsFromRetell = vi.fn();
const listAgents = vi.fn(async () => [fx.outboundAgent]);
vi.mock("@/services/agentsService", () => ({
  listAgents: () => listAgents(),
  deleteAgent: (id: string) => deleteAgent(id),
  syncAgentsFromRetell: () => syncAgentsFromRetell(),
  getAgent: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(),
}));

const createKnowledgeBase = vi.fn();
const deleteKnowledgeBase = vi.fn();
const refreshKnowledgeBase = vi.fn();
const addSources = vi.fn();
const listKnowledgeBases = vi.fn(async () => [fx.knowledgeBase]);
vi.mock("@/services/knowledgeBaseService", () => ({
  listKnowledgeBases: () => listKnowledgeBases(),
  createKnowledgeBase: (...a: unknown[]) => createKnowledgeBase(...a),
  deleteKnowledgeBase: (id: string) => deleteKnowledgeBase(id),
  refreshKnowledgeBase: (id: string) => refreshKnowledgeBase(id),
  addSources: (...a: unknown[]) => addSources(...a),
  getAgentKnowledgeBaseIds: vi.fn(async () => []), setAgentKnowledgeBases: vi.fn(),
}));
vi.mock("@/services/creditsService", () => ({
  getBillingAccount: vi.fn(async () => ({ credits: 200, plan_tier: "scale" })),
  listTransactions: vi.fn(async () => []),
}));
vi.mock("@/services/retellService", () => ({
  retellService: {
    createWebCall: vi.fn(), listVoices: vi.fn(async () => fx.voices),
    // The page deletes the Retell agent before the row; without this the call
    // throws and the row delete is never reached.
    deleteAgent: vi.fn(async () => undefined),
  },
  RetellApiError: class RetellApiError extends Error {},
}));

const mount = async (file: string, route: string) => {
  const { default: Page } = await import(file);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CallModeProvider><Routes><Route path={route} element={<Page />} /></Routes></CallModeProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listAgents.mockResolvedValue([fx.outboundAgent]);
  listKnowledgeBases.mockResolvedValue([fx.knowledgeBase]);
  deleteAgent.mockResolvedValue(undefined);
  syncAgentsFromRetell.mockResolvedValue({ synced: 3 });
  createKnowledgeBase.mockResolvedValue({ id: "kb2", name: "New KB" });
  deleteKnowledgeBase.mockResolvedValue(undefined);
  refreshKnowledgeBase.mockResolvedValue(undefined);
  addSources.mockResolvedValue(undefined);
});

describe("the agents list", () => {
  it("Create Agent navigates to the form", async () => {
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getAllByRole("button", { name: /create agent/i })[0]);
    expect(navigate).toHaveBeenCalledWith("/ai-agents/create");
  });

  it("Edit opens that agent's form", async () => {
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(navigate).toHaveBeenCalledWith(`/ai-agents/${fx.outboundAgent.id}/edit`);
  });

  it("Sync reports how many agents came back", async () => {
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /sync/i }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Synced 3 agents from Retell."));
  });

  it("a failed sync says so rather than looking like nothing happened", async () => {
    syncAgentsFromRetell.mockRejectedValue(new Error("Retell unreachable"));
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /sync/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Retell unreachable"));
  });
});

describe("deleting an agent is guarded", () => {
  it("does nothing if the confirmation is dismissed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(confirm).toHaveBeenCalledWith('Delete "Campaign Agent"?');
    expect(deleteAgent).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("deletes once confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteAgent).toHaveBeenCalledWith(fx.outboundAgent.id));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Agent deleted."));
    confirm.mockRestore();
  });

  it("surfaces a delete failure", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteAgent.mockRejectedValue(new Error("Agent is in use by a running campaign"));
    const user = userEvent.setup();
    await mount("./AIAgentsPage.tsx", "/ai-agents");
    await screen.findByText("Campaign Agent");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Agent is in use by a running campaign"));
    expect(toasts.success).not.toHaveBeenCalled();
  });
});

describe("creating a knowledge base", () => {
  const openCreate = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByText("Courses and fees");
    await user.click(screen.getAllByRole("button", { name: /new knowledge base/i })[0]);
    return screen.findByRole("dialog");
  };

  it("opens the dialog with a name field", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await openCreate(user);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  it("refuses to create one with no sources at all", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await openCreate(user);
    await user.type(screen.getByLabelText(/^name$/i), "Fees 2026");
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/at least one source/i)));
    expect(createKnowledgeBase).not.toHaveBeenCalled();
  });

  it("creates one from pasted notes", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await openCreate(user);
    await user.type(screen.getByLabelText(/^name$/i), "Fees 2026");
    await user.type(screen.getByLabelText(/notes/i), "Tuition is £9,250 a year.");
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(createKnowledgeBase).toHaveBeenCalled());
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('"Fees 2026" created. Indexing now.'));
  });

  it("reports a creation failure and keeps the dialog open", async () => {
    createKnowledgeBase.mockRejectedValue(new Error("Retell rejected the document"));
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await openCreate(user);
    await user.type(screen.getByLabelText(/^name$/i), "Fees 2026");
    await user.type(screen.getByLabelText(/notes/i), "Some text.");
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Retell rejected the document"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("the actions on an existing knowledge base", () => {
  it("Refresh re-indexes it", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await screen.findByText("Courses and fees");
    await user.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(refreshKnowledgeBase).toHaveBeenCalledWith(fx.knowledgeBase.retell_kb_id));
  });

  it("Add opens the add-sources dialog for that base", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await screen.findByText("Courses and fees");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText(/add to courses and fees/i)).toBeInTheDocument();
  });

  it("adding with nothing filled in is refused", async () => {
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await screen.findByText("Courses and fees");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await screen.findByText(/add to courses and fees/i);
    await user.click(screen.getByRole("button", { name: /^add sources$|^add$/i, hidden: false }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith(expect.stringMatching(/at least one source/i)));
  });

  it("Delete asks first, and does nothing when dismissed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await screen.findByText("Courses and fees");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Delete "Courses and fees"/));
    expect(deleteKnowledgeBase).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("Delete removes it once confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    await mount("./KnowledgeBasePage.tsx", "/knowledge-base");
    await screen.findByText("Courses and fees");
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteKnowledgeBase).toHaveBeenCalledWith(fx.knowledgeBase.retell_kb_id));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Knowledge base deleted."));
    confirm.mockRestore();
  });
});
