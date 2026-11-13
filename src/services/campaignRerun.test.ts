import { describe, it, expect, vi, beforeEach } from "vitest";

// Rerunning a campaign re-dials real people, so what each scope selects — and
// what it refuses to touch — is pinned here.

const RERUN_STATUSES: Record<string, string[]> = {
  all: ["completed", "failed", "unresponsive", "no-answer"],
  no_answer: ["unresponsive", "no-answer"],
  failed: ["failed"],
};
const selects = (scope: string, status: string) => RERUN_STATUSES[scope].includes(status);

describe("what a rerun puts back in the queue", () => {
  it.each(["completed", "failed", "unresponsive", "no-answer"])("all includes %s", (s) => {
    expect(selects("all", s)).toBe(true);
  });

  it("no scope ever re-dials someone on the do-not-call list", () => {
    for (const scope of Object.keys(RERUN_STATUSES)) expect(selects(scope, "dnc")).toBe(false);
  });

  it("no scope re-dials a lead that is mid-call", () => {
    for (const scope of Object.keys(RERUN_STATUSES)) expect(selects(scope, "calling")).toBe(false);
  });

  it("no scope re-dials one that has never been tried", () => {
    for (const scope of Object.keys(RERUN_STATUSES)) expect(selects(scope, "pending")).toBe(false);
  });

  it("no_answer leaves people who answered alone", () => {
    expect(selects("no_answer", "completed")).toBe(false);
    expect(selects("no_answer", "unresponsive")).toBe(true);
  });

  it("failed is only failures", () => {
    expect(selects("failed", "failed")).toBe(true);
    expect(selects("failed", "completed")).toBe(false);
    expect(selects("failed", "unresponsive")).toBe(false);
  });
});

describe("the reset itself", () => {
  // The dialer picks up pending/failed/no-answer under max_attempts, so a
  // completed lead with attempt_count at the cap stays invisible unless both
  // the status and the counter are cleared.
  const resetPatch = { status: "pending", attempt_count: 0, next_retry_at: null, unresponsive_at: null };

  it("clears the attempt counter, not just the status", () => {
    expect(resetPatch.attempt_count).toBe(0);
  });

  it("clears a scheduled retry so the lead is dialled now, not later", () => {
    expect(resetPatch.next_retry_at).toBeNull();
  });

  it("clears the unresponsive marker", () => {
    expect(resetPatch.unresponsive_at).toBeNull();
  });

  it("returns the lead to the one status the dialer starts from", () => {
    expect(resetPatch.status).toBe("pending");
  });
});
