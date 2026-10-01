import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { CallModeProvider } from "@/lib/callMode";

// The layout reads the signed-in user synchronously and renders nothing without
// one, so the auth module is stubbed rather than driving a real session.
const signOut = vi.fn();
vi.mock("@/lib/devAuth", () => ({
  getDevUser: () => globalThis.__testUser,
  canAccessRoute: () => true,
  devSignOut: () => signOut(),
}));

declare global {
  var __testUser: { id: string; email: string; name: string; initials: string; role: string } | null;
}

const asUser = { id: "u1", email: "ravi@example.com", name: "Ravi", initials: "RA", role: "admin" };

const renderLayout = (props: Partial<React.ComponentProps<typeof DashboardLayout>> = {}) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CallModeProvider>
        <DashboardLayout {...props}>
          <p>page body</p>
        </DashboardLayout>
      </CallModeProvider>
    </MemoryRouter>,
  );

describe("DashboardLayout", () => {
  beforeEach(() => {
    globalThis.__testUser = asUser;
    localStorage.clear();
  });

  it("renders the page content it wraps", () => {
    renderLayout();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("shows the signed-in user", () => {
    renderLayout();
    expect(screen.getByText("Ravi")).toBeInTheDocument();
    expect(screen.getByText(/ravi@example\.com/)).toBeInTheDocument();
  });

  it("highlights the current route", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: /Overview/ }).className).toContain("text-cyan-600");
  });

  it("highlights the parent nav item via activeHref on detail pages", () => {
    // A campaign detail page isn't /dashboard/campaigns itself, but must still
    // light up "Campaigns" in the sidebar.
    renderLayout({ activeHref: "/dashboard/campaigns" });
    expect(screen.getByRole("link", { name: /Campaigns/ }).className).toContain("text-cyan-600");
  });

  it("applies a custom main class for full-height form pages", () => {
    const { container } = renderLayout({ mainClassName: "flex-1 ml-[260px] h-screen flex flex-col" });
    expect(container.querySelector("main")?.className).toBe("flex-1 ml-[260px] h-screen flex flex-col");
  });

  it("renders nothing when there is no signed-in user", () => {
    globalThis.__testUser = null;
    const { container } = renderLayout();
    expect(container).toBeEmptyDOMElement();
  });
});

describe("DashboardLayout call-mode switch", () => {
  beforeEach(() => {
    globalThis.__testUser = asUser;
    localStorage.clear();
  });

  it("starts in outbound and shows the outbound destinations", () => {
    renderLayout();
    expect(screen.getByRole("tab", { name: /outbound/i })).toHaveAttribute("aria-selected", "true");
    for (const label of ["Overview", "AI Agents", "Campaigns", "Leads"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: /Enquiries/ })).not.toBeInTheDocument();
  });

  it("swaps the whole nav when switched to inbound", async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole("tab", { name: /inbound/i }));

    for (const label of ["Numbers", "Calls", "Enquiries"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
    // Outbound-only destinations must not linger in inbound mode.
    expect(screen.queryByRole("link", { name: /Campaigns/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Leads/ })).not.toBeInTheDocument();
  });

  it("keeps shared destinations in both modes", async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.getByRole("link", { name: /Knowledge Base/ })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /inbound/i }));
    for (const label of ["Knowledge Base", "Settings", "Academy", "Support"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("remembers the chosen mode across reloads", async () => {
    const user = userEvent.setup();
    const { unmount } = renderLayout();
    await user.click(screen.getByRole("tab", { name: /inbound/i }));
    unmount();

    renderLayout();
    expect(screen.getByRole("tab", { name: /inbound/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /Enquiries/ })).toBeInTheDocument();
  });
});
