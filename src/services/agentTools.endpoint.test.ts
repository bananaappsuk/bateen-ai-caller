import { describe, it, expect } from "vitest";

// The rules inside the agent-tools function, pinned here because they are the
// difference between a helpful call and a damaging one. Mirrors
// supabase/functions/agent-tools.

// ---- withheld numbers ----------------------------------------------------
const WITHHELD = new Set(["anonymous", "unavailable", "private", "restricted", "unknown", "+266696687", "266696687"]);
const usableNumber = (n: string | undefined): string | null => {
  const v = (n ?? "").trim();
  if (!v || WITHHELD.has(v.toLowerCase())) return null;
  return /^\+?[0-9]{7,15}$/.test(v.replace(/[\s()-]/g, "")) ? v : null;
};

describe("a withheld caller must never become a shared fake customer", () => {
  it.each([
    ["+266696687", "Twilio's anonymous sentinel"],
    ["anonymous", "carrier wording"],
    ["Unavailable", "carrier wording, different case"],
    ["private", "carrier wording"],
    ["restricted", "carrier wording"],
    ["", "nothing at all"],
    ["   ", "whitespace"],
    [undefined, "absent"],
  ])("rejects %s (%s)", (input) => {
    expect(usableNumber(input as string | undefined)).toBeNull();
  });

  it.each(["+447700900123", "447700900123", "+44 7700 900123", "(07700) 900123"])(
    "accepts the real number %s",
    (n) => expect(usableNumber(n)).not.toBeNull(),
  );

  it("rejects something that is not a number at all", () => {
    expect(usableNumber("ask the office")).toBeNull();
  });

  // Without this every withheld caller shares one `leads` row, reading and
  // overwriting each other's messages.
  it("two withheld callers cannot resolve to the same key", () => {
    expect(usableNumber("+266696687")).toBeNull();
    expect(usableNumber("anonymous")).toBeNull();
  });
});

// ---- never lose what we already knew -------------------------------------
const appendSummary = (previous: string | null | undefined, next: string): string => {
  const prior = (previous ?? "").trim();
  if (!prior) return next;
  if (prior.startsWith(next)) return prior;
  return `${next}\n\nEarlier: ${prior}`.slice(0, 2000);
};

/** Mirrors the spread that only writes a name when one was actually given. */
const namePatch = (name: string | null) => (name ? { name } : {});

describe("a caller's details survive a second call", () => {
  it("keeps the stored name when they do not restate it", () => {
    // The bug this replaced: "Priya Patel" became null the moment she rang back
    // and only left a message.
    expect(namePatch(null)).toEqual({});
  });

  it("updates the name when they do give one", () => {
    expect(namePatch("Priya Patel")).toEqual({ name: "Priya Patel" });
  });

  it("keeps the earlier message, newest first", () => {
    const out = appendSummary("Asking about September intake.", "Also asking about fees.");
    expect(out.startsWith("Also asking about fees.")).toBe(true);
    expect(out).toContain("Earlier: Asking about September intake.");
  });

  it("does not stack the same message twice if a tool retries", () => {
    const first = appendSummary(null, "Please ring me back.");
    expect(appendSummary(first, "Please ring me back.")).toBe(first);
  });

  it("starts clean when there is nothing earlier", () => {
    expect(appendSummary(null, "First message.")).toBe("First message.");
    expect(appendSummary("   ", "First message.")).toBe("First message.");
  });

  it("stays within a sane length however many times they ring", () => {
    let s = "x".repeat(100);
    for (let i = 0; i < 50; i++) s = appendSummary(s, `message ${i}`);
    expect(s.length).toBeLessThanOrEqual(2000);
  });
});

// ---- everything the caller hears -----------------------------------------
describe("every reply is something that can be read down a phone", () => {
  const replies = [
    "Your number is not showing, so I can't look you up. I can still help — I'll just need to ask you a couple of things.",
    "I can't see the number you're ringing from — what's the best number to reach you on?",
    "I've taken that down and passed it on. Someone will come back to you.",
    "That's booked in, we'll ring you back.",
    "I can't do that one, but I can take a message if that helps.",
    "Sorry, something went wrong at our end just then.",
    "I can't reach our system for that right now.",
  ];

  it.each(replies)("%s reads as speech", (text) => {
    expect(text).not.toMatch(/[{}[\]<>]/); // no JSON or markup
    expect(text).not.toMatch(/\b(null|undefined|error|exception|500|42501)\b/i);
    expect(text.length).toBeLessThan(200);
  });

  it("a failure never tells the caller what broke", () => {
    const failure = "Sorry, something went wrong at our end just then.";
    expect(failure).not.toMatch(/database|supabase|retell|rls|policy|stack/i);
  });
});

// ---- tenancy -------------------------------------------------------------
describe("a tool only ever acts for the tenant that owns the call", () => {
  // Resolution order: the live call first, the agent id in the URL only as a
  // fallback, and nothing at all if neither resolves.
  const resolve = (callOwner: string | null, agentOwner: string | null) =>
    callOwner ?? agentOwner ?? null;

  it("prefers the owner of the live call", () => {
    expect(resolve("tenant-a", "tenant-b")).toBe("tenant-a");
  });

  it("falls back to the agent when the call row has not landed yet", () => {
    // call_started can arrive after the agent has already used a tool.
    expect(resolve(null, "tenant-b")).toBe("tenant-b");
  });

  it("does nothing at all when neither resolves", () => {
    expect(resolve(null, null)).toBeNull();
  });
});
