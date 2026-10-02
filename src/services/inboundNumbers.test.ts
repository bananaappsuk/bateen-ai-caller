import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Adding an inbound number failed in production with "Could not add the number."
// Two separate faults produced that one useless toast:
//   1. `inbound_numbers` had RLS enabled with SELECT and UPDATE policies only,
//      so the insert was rejected and the delete silently matched no rows —
//      returning 204 while the row stayed in the table.
//   2. The rejection was a plain object, not an `Error`, so the page's
//      `instanceof Error` narrowing dropped the reason on the floor.
// These tests pin both.

const rlsError = {
  message: 'new row violates row-level security policy for table "inbound_numbers"',
  code: "42501",
  details: null,
  hint: null,
};

let failing = false;
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "order", "limit"]) chain[m] = () => chain;
  chain.single = async () =>
    failing ? { data: null, error: rlsError } : { data: { id: "n1", phone_number: "+447700900123", agent_id: null, label: null, created_at: "2026-10-02T00:00:00Z" }, error: null };
  chain.then = (res: (r: unknown) => unknown) =>
    Promise.resolve(failing ? { data: null, error: rlsError } : { data: [], error: null }).then(res);
  return {
    supabase: {
      from: () => chain,
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    },
  };
});

beforeEach(() => {
  failing = false;
});

describe("a rejected write reaches the caller as a readable Error", () => {
  it("addInboundNumber throws a real Error, not a bare postgres object", async () => {
    const { addInboundNumber } = await import("./inboundService");
    failing = true;
    await expect(addInboundNumber("+447700900123")).rejects.toBeInstanceOf(Error);
  });

  it("and the message explains the problem instead of the generic fallback", async () => {
    const { addInboundNumber } = await import("./inboundService");
    failing = true;
    // The old code produced "Could not add the number." for every cause alike.
    await expect(addInboundNumber("+447700900123")).rejects.toThrow(/do not have permission/i);
  });

  it("removeInboundNumber surfaces a rejection too, rather than appearing to succeed", async () => {
    const { removeInboundNumber } = await import("./inboundService");
    failing = true;
    await expect(removeInboundNumber("n1")).rejects.toBeInstanceOf(Error);
  });

  it("a successful add still returns the row", async () => {
    const { addInboundNumber } = await import("./inboundService");
    const row = await addInboundNumber("+447700900123");
    expect(row.phone_number).toBe("+447700900123");
  });
});

describe("inbound_numbers has a policy for every command the browser issues", () => {
  // The browser inserts, selects, updates and deletes this table directly, so a
  // missing policy is not a hardening gap — it is a broken feature.
  const dir = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  const policiesFor = (table: string) =>
    [...sql.matchAll(new RegExp(`CREATE POLICY[^;]*?ON public\\.${table}\\s+FOR\\s+(\\w+)`, "gis"))]
      .map((m) => m[1].toUpperCase());

  it.each(["SELECT", "INSERT", "UPDATE", "DELETE"])("has a %s policy", (cmd) => {
    expect(policiesFor("inbound_numbers")).toContain(cmd);
  });

  it("scopes the insert to the owner, so a client cannot write a foreign row", () => {
    const insert = sql.match(/CREATE POLICY[^;]*inbound_numbers\s+FOR INSERT[^;]*/is)?.[0] ?? "";
    expect(insert).toMatch(/WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("scopes the delete to the owner", () => {
    const del = sql.match(/CREATE POLICY[^;]*inbound_numbers\s+FOR DELETE[^;]*/is)?.[0] ?? "";
    expect(del).toMatch(/USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });
});
