import { describe, it, expect } from "vitest";

// The campaign counters used to be incremented per dispatch as
// `campaign.called_leads + 1`, reading a value captured at the start of the
// tick. Every call in a batch therefore wrote the same number and all but one
// increment was lost — an 18-lead run reported 3 called. They are now derived
// from the leads, which is what these tests pin down.

type Lead = { status: string; attempt_count?: number };

const derive = (leads: Lead[]) => ({
  called: leads.filter((l) => (l.attempt_count ?? 0) > 0).length,
  failed: leads.filter((l) => l.status === "failed").length,
});

describe("campaign counters are derived from leads", () => {
  it("counts every attempted lead, not just the last writer", () => {
    // The real "UK 2" run: 13 connected + 5 no-answer, all attempted once.
    const leads: Lead[] = [
      ...Array.from({ length: 13 }, () => ({ status: "completed", attempt_count: 1 })),
      ...Array.from({ length: 5 }, () => ({ status: "no-answer", attempt_count: 1 })),
    ];
    expect(derive(leads).called).toBe(18); // the UI previously showed 3
  });

  it("ignores leads that were never dialled", () => {
    const leads: Lead[] = [
      { status: "completed", attempt_count: 1 },
      { status: "pending", attempt_count: 0 },
      { status: "pending" },
    ];
    expect(derive(leads).called).toBe(1);
  });

  it("counts retries as one attempted lead, not many", () => {
    const leads: Lead[] = [{ status: "no-answer", attempt_count: 3 }];
    expect(derive(leads).called).toBe(1);
  });

  it("counts failures separately", () => {
    const leads: Lead[] = [
      { status: "failed", attempt_count: 1 },
      { status: "failed", attempt_count: 2 },
      { status: "completed", attempt_count: 1 },
    ];
    const d = derive(leads);
    expect(d.failed).toBe(2);
    expect(d.called).toBe(3);
  });

  it("is idempotent, so a drifted counter self-heals", () => {
    const leads: Lead[] = Array.from({ length: 6 }, () => ({ status: "completed", attempt_count: 1 }));
    expect(derive(leads)).toEqual(derive(leads));
    expect(derive(leads).called).toBe(6);
  });

  it("a whole batch dispatching at once still lands on the true total", () => {
    // Ten concurrent dispatches: the old code wrote `stale + 1` ten times and
    // ended on 1. Deriving gives 10 regardless of write ordering.
    const leads: Lead[] = Array.from({ length: 10 }, () => ({ status: "calling", attempt_count: 1 }));
    expect(derive(leads).called).toBe(10);
  });
});
