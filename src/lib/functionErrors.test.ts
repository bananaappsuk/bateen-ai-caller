import { describe, it, expect } from "vitest";
import { describeFunctionFailure, throwFunctionError, asError } from "./functionErrors";

// supabase-js reports every failure as "Edge Function returned a non-2xx status
// code" with the real body hidden on error.context. A dev once watched a
// 23-lead campaign stall behind exactly that string, so these tests pin what a
// user is told for each status the platform actually returns.

const invokeError = (status: number, body: unknown = {}) =>
  Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: new Response(JSON.stringify(body), { status }),
  });

describe("the session-expiry case", () => {
  it("401 says to sign in again", async () => {
    const r = await describeFunctionFailure(invokeError(401), null);
    expect(r.message).toMatch(/session has expired.*sign in again/i);
    expect(r.sessionExpired).toBe(true);
    expect(r.status).toBe(401);
  });

  it("403 is treated the same way", async () => {
    const r = await describeFunctionFailure(invokeError(403), null);
    expect(r.sessionExpired).toBe(true);
    expect(r.message).toMatch(/session has expired/i);
  });

  it("never leaks the raw supabase wording", async () => {
    for (const status of [401, 402, 404, 413, 429, 500, 503]) {
      const r = await describeFunctionFailure(invokeError(status), null);
      expect(r.message).not.toMatch(/non-2xx/i);
    }
  });
});

describe("the other statuses the platform returns", () => {
  it("402 — the vendor account is suspended — avoids blaming the user", async () => {
    const r = await describeFunctionFailure(invokeError(402), null);
    expect(r.message).toMatch(/temporarily unavailable.*support/i);
    expect(r.sessionExpired).toBe(false);
  });

  it("404 tells the user to refresh", async () => {
    expect((await describeFunctionFailure(invokeError(404), null)).message).toMatch(/no longer exists/i);
  });

  it("413 names the real problem: the file", async () => {
    expect((await describeFunctionFailure(invokeError(413), null)).message).toMatch(/too large/i);
  });

  it("429 asks the user to wait", async () => {
    expect((await describeFunctionFailure(invokeError(429), null)).message).toMatch(/too many requests/i);
  });

  it("500 and 503 do not blame the user", async () => {
    expect((await describeFunctionFailure(invokeError(500), null)).message).toMatch(/our side/i);
    expect((await describeFunctionFailure(invokeError(503), null)).message).toMatch(/busy/i);
  });
});

describe("the server's own message always wins", () => {
  it("prefers data.error over anything inferred", async () => {
    const r = await describeFunctionFailure(invokeError(400), { error: "Audio must be a wav, mp3, m4a file." });
    expect(r.message).toBe("Audio must be a wav, mp3, m4a file.");
  });

  it("reads the message out of the response body when data is empty", async () => {
    const r = await describeFunctionFailure(invokeError(400, { error: "Give the voice a name." }), null);
    expect(r.message).toBe("Give the voice a name.");
  });

  it("but a 401 outranks it, because \"Unauthorized.\" helps nobody", async () => {
    const r = await describeFunctionFailure(invokeError(401, { error: "Unauthorized." }), null);
    expect(r.message).toMatch(/session has expired/i);
    expect(r.message).not.toBe("Unauthorized.");
    expect(r.sessionExpired).toBe(true);
  });

  it("does not consume the response, so another reader still works", async () => {
    const err = invokeError(400, { error: "First read." });
    await describeFunctionFailure(err, null);
    const second = await (err as unknown as { context: Response }).context.clone().json();
    expect(second.error).toBe("First read.");
  });
});

describe("failures with no response at all", () => {
  it("keeps a real network message", async () => {
    const r = await describeFunctionFailure(new TypeError("Failed to fetch"), null);
    expect(r.message).toBe("Failed to fetch");
    expect(r.sessionExpired).toBe(false);
  });

  it("falls back to the caller's wording when there is nothing to report", async () => {
    const r = await describeFunctionFailure(null, null, "Could not load voices.");
    expect(r.message).toBe("Could not load voices.");
  });

  it("uses a sane default when the caller gave none", async () => {
    expect((await describeFunctionFailure(null, null)).message).toMatch(/something went wrong/i);
  });
});

describe("throwFunctionError", () => {
  it("throws with the described message", async () => {
    await expect(throwFunctionError(invokeError(401), null)).rejects.toThrow(/session has expired/i);
  });
  it("throws the server's message when it has one", async () => {
    await expect(throwFunctionError(null, { error: "No credits left." })).rejects.toThrow("No credits left.");
  });
});

describe("asError — a failed query must not lose its reason", () => {
  // The bug this exists for: supabase-js rejects table operations with a plain
  // object, callers narrow with `instanceof Error`, and the real cause was
  // replaced by each caller's generic fallback.
  const rls = { message: 'new row violates row-level security policy for table "inbound_numbers"', code: "42501", details: null, hint: null };

  it("returns a real Error, so `instanceof Error` narrowing works", () => {
    expect(asError(rls)).toBeInstanceOf(Error);
  });

  it("an RLS rejection says something a user can act on", () => {
    expect(asError(rls).message).toBe("You do not have permission to make that change. Please contact support.");
  });

  it("never leaks the raw postgres wording", () => {
    const m = asError(rls).message;
    expect(m).not.toMatch(/row-level security/i);
    expect(m).not.toMatch(/violates/i);
  });

  it("keeps the code so a caller can word a case better itself", () => {
    const err = asError({ message: "duplicate key value violates unique constraint", code: "23505" });
    expect((err as Error & { code?: string }).code).toBe("23505");
  });

  it.each([
    ["23505", "That already exists."],
    ["23503", "That refers to something that no longer exists. Refresh the page."],
    ["23502", "Something required was missing. Check the form and try again."],
    ["PGRST301", "Your session has expired. Refresh the page and sign in again to continue."],
  ])("maps %s to a plain-English message", (code, expected) => {
    expect(asError({ message: "whatever postgres said", code }).message).toBe(expected);
  });

  it("falls back to the error's own message for a code it does not know", () => {
    expect(asError({ message: "connection terminated", code: "08006" }).message).toBe("connection terminated");
  });

  it("passes a real Error straight through", () => {
    const e = new Error("already fine");
    expect(asError(e)).toBe(e);
  });

  it.each([[null], [undefined], [{}], [42]])("still produces a message for %s", (input) => {
    expect(asError(input).message).toBe("Something went wrong. Try again.");
  });

  it("uses a string rejection as the message", () => {
    expect(asError("plain string failure").message).toBe("plain string failure");
  });
});
