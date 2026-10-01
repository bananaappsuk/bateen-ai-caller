import { describe, it, expect, vi, beforeEach } from "vitest";

// A campaign dials from the browser on a timer, so the Supabase session can
// lapse mid-run and every reservation starts 401-ing. supabase-js reports only
// "Edge Function returned a non-2xx status code", which told one dev nothing
// while a 23-lead campaign quietly stalled. These pin the translated message.

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

const httpError = (status: number, body: unknown = {}) =>
  Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: new Response(JSON.stringify(body), { status }),
  });

beforeEach(() => invoke.mockReset());

describe("reserveCallCredit error messages", () => {
  it("turns a 401 into something the user can act on", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(401, { error: "Unauthorized." }) });
    const { reserveCallCredit } = await import("./creditsService");
    await expect(reserveCallCredit()).rejects.toThrow(/session has expired.*sign in again/i);
  });

  it("never leaks the raw non-2xx wording on a 401", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(401) });
    const { reserveCallCredit } = await import("./creditsService");
    await expect(reserveCallCredit()).rejects.not.toThrow(/non-2xx/i);
  });

  it("surfaces the server's own message for other failures", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(500, { error: "Credits ledger unavailable." }) });
    const { reserveCallCredit } = await import("./creditsService");
    await expect(reserveCallCredit()).rejects.toThrow("Credits ledger unavailable.");
  });

  it("passes a successful reservation straight through", async () => {
    invoke.mockResolvedValue({ data: { authorized: true, credits: 193 }, error: null });
    const { reserveCallCredit } = await import("./creditsService");
    await expect(reserveCallCredit()).resolves.toEqual({ authorized: true, credits: 193 });
  });

  it("reports an unauthorised reservation as a normal result, not an error", async () => {
    // Running out of credits is a 200 with authorized:false — it must not be
    // confused with the session having expired.
    invoke.mockResolvedValue({ data: { authorized: false, credits: 0 }, error: null });
    const { reserveCallCredit } = await import("./creditsService");
    await expect(reserveCallCredit()).resolves.toEqual({ authorized: false, credits: 0 });
  });
});
