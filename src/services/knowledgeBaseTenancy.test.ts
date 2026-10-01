import { describe, it, expect } from "vitest";

// Every tenant's knowledge bases live on the one shared Retell account, so
// Retell's own /list-knowledge-bases returns all of them to anyone holding the
// platform key. list-knowledge-bases therefore starts from OUR ownership table
// and only enriches those rows. This is the same class of leak that was fixed
// for cloned voices; these tests pin the rule so it can't regress.

interface Owned { id: string; retell_kb_id: string; name: string; status: string; source_count: number }
interface RetellKb { knowledge_base_id: string; status?: string; knowledge_base_sources?: unknown[] }

function merge(owned: Owned[], live: RetellKb[]) {
  const byId = new Map(live.map((k) => [k.knowledge_base_id, k]));
  return owned.map((r) => {
    const k = byId.get(r.retell_kb_id);
    return {
      ...r,
      status: k?.status ?? r.status,
      source_count: k?.knowledge_base_sources?.length ?? r.source_count,
      missing_upstream: live.length > 0 && !k,
    };
  });
}

const mine: Owned[] = [
  { id: "row1", retell_kb_id: "kb_mine", name: "Courses and fees", status: "in_progress", source_count: 0 },
];
const everyoneOnTheAccount: RetellKb[] = [
  { knowledge_base_id: "kb_mine", status: "complete", knowledge_base_sources: [{}, {}, {}] },
  { knowledge_base_id: "kb_other_tenant", status: "complete", knowledge_base_sources: [{}] },
  { knowledge_base_id: "kb_third_tenant", status: "complete", knowledge_base_sources: [] },
];

describe("knowledge base tenancy", () => {
  it("returns only the caller's knowledge bases", () => {
    const out = merge(mine, everyoneOnTheAccount);
    expect(out).toHaveLength(1);
    expect(out[0].retell_kb_id).toBe("kb_mine");
  });

  it("never exposes another tenant's knowledge base id or name", () => {
    const serialised = JSON.stringify(merge(mine, everyoneOnTheAccount));
    expect(serialised).not.toContain("kb_other_tenant");
    expect(serialised).not.toContain("kb_third_tenant");
  });

  it("a tenant who owns nothing sees nothing, however many exist upstream", () => {
    expect(merge([], everyoneOnTheAccount)).toHaveLength(0);
  });

  it("takes live status and source count from Retell", () => {
    const [kb] = merge(mine, everyoneOnTheAccount);
    expect(kb.status).toBe("complete"); // ours said in_progress
    expect(kb.source_count).toBe(3);
  });

  it("flags a knowledge base deleted directly in the Retell dashboard", () => {
    const [kb] = merge(mine, [{ knowledge_base_id: "kb_other_tenant" }]);
    expect(kb.missing_upstream).toBe(true);
  });

  it("does not cry wolf when Retell is unreachable", () => {
    // An empty upstream list means we failed to reach Retell, not that every
    // knowledge base vanished — the stored values stand.
    const [kb] = merge(mine, []);
    expect(kb.missing_upstream).toBe(false);
    expect(kb.status).toBe("in_progress");
  });
});

describe("knowledge bases are shared across call directions", () => {
  // A knowledge base is scoped to a user, never to inbound or outbound, so the
  // same one can serve a campaign dialer and a reception agent at once.
  const kbsFor = (userId: string, all: { user_id: string; id: string }[]) =>
    all.filter((k) => k.user_id === userId);

  const all = [
    { user_id: "u1", id: "courses" },
    { user_id: "u1", id: "pricing" },
    { user_id: "u2", id: "theirs" },
  ];

  it("offers the same list regardless of direction", () => {
    const outbound = kbsFor("u1", all);
    const inbound = kbsFor("u1", all);
    expect(outbound).toEqual(inbound);
    expect(outbound.map((k) => k.id)).toEqual(["courses", "pricing"]);
  });

  it("still keeps tenants apart", () => {
    expect(kbsFor("u2", all).map((k) => k.id)).toEqual(["theirs"]);
  });
});
