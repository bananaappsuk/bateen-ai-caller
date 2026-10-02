import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// The sign-in flow, clicked through. BUG-001 (no way to reveal the password),
// BUG-002 (the browser never offered to save it) and the "email sent" lie shown
// for an address with no account were all reported from this screen, so each one
// gets a test that fails if it comes back.

const signIn = vi.fn();
const sendPasswordReset = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/devAuth", () => ({
  signIn: (e: string, p: string) => signIn(e, p),
  sendPasswordReset: (e: string) => sendPasswordReset(e),
  signUp: vi.fn(),
  getDevUser: () => null,
  canAccessRoute: () => true,
  devSignOut: vi.fn(),
}));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => navigate,
}));

const mountLogin = async () => {
  const { default: Page } = await import("./LoginPage.tsx");
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes><Route path="/login" element={<Page />} /></Routes>
    </MemoryRouter>,
  );
};

/** Gets past the email step, which gates the password form. */
const toPasswordStep = async (user: ReturnType<typeof userEvent.setup>, email = "someone@example.com") => {
  await user.type(screen.getByPlaceholderText(/you@company.com/i), email);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return screen.findByLabelText(/^password$/i);
};

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  sendPasswordReset.mockResolvedValue(true);
});

describe("the two-step sign-in", () => {
  it("asks for the email first and no password yet", async () => {
    await mountLogin();
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it("will not advance on an empty email", async () => {
    const user = userEvent.setup();
    await mountLogin();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it("advances to the password step and shows which email it is for", async () => {
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user, "jane@example.com");
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("Change goes back to the email step", async () => {
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user);
    await user.click(screen.getByRole("button", { name: /change/i }));
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it("signs in with the typed credentials and goes to the dashboard", async () => {
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user, "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "s3cret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("jane@example.com", "s3cret"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the reason a sign-in failed and stays put", async () => {
    signIn.mockRejectedValue(new Error("Invalid login credentials"));
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("re-enables the button after a failure so a second attempt is possible", async () => {
    signIn.mockRejectedValue(new Error("Invalid login credentials"));
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await screen.findByText(/invalid login credentials/i);
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled();
  });
});

describe("BUG-001: the password can be revealed", () => {
  it("is masked to begin with", async () => {
    const user = userEvent.setup();
    await mountLogin();
    expect(await toPasswordStep(user)).toHaveAttribute("type", "password");
  });

  it("the eye button unmasks it, and masks it again", async () => {
    const user = userEvent.setup();
    await mountLogin();
    const field = await toPasswordStep(user);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(field).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("the toggle does not submit the form", async () => {
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("BUG-002: the browser is given a credential pair to save", () => {
  it("the password field is marked as the current password", async () => {
    const user = userEvent.setup();
    await mountLogin();
    expect(await toPasswordStep(user)).toHaveAttribute("autocomplete", "current-password");
  });

  it("the password form also carries the username, which is what prompts the save", async () => {
    const user = userEvent.setup();
    const { container } = await mountLogin();
    await toPasswordStep(user, "jane@example.com");
    const username = container.querySelector('input[name="username"][autocomplete="username"]') as HTMLInputElement;
    expect(username).toBeTruthy();
    expect(username.value).toBe("jane@example.com");
  });
});

describe("forgot password tells the truth about the account", () => {
  it("confirms when the account exists", async () => {
    sendPasswordReset.mockResolvedValue(true);
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user, "real@example.com");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(await screen.findByText(/emailed a password reset link to real@example.com/i)).toBeInTheDocument();
  });

  // The reported bug: an unknown address was told an email had been sent.
  it("says no account exists instead of claiming an email was sent", async () => {
    sendPasswordReset.mockResolvedValue(false);
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user, "nobody@example.com");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(await screen.findByText(/no account exists with the email nobody@example.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/emailed a password reset link/i)).not.toBeInTheDocument();
  });

  it("reports a transport failure rather than silently doing nothing", async () => {
    sendPasswordReset.mockRejectedValue(new Error("Mail server unreachable"));
    const user = userEvent.setup();
    await mountLogin();
    await toPasswordStep(user);
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(await screen.findByText(/mail server unreachable/i)).toBeInTheDocument();
  });
});
