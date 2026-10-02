import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { browserOperations, permittedByMigrations } from "@/test/rlsPolicies";

// The missing INSERT/DELETE policy on `inbound_numbers` shipped because every
// one of 206 tests mocked the service layer, so nothing ever exercised a real
// policy. This closes the class of bug rather than that one instance: it reads
// what the browser does to each table, replays what the migrations permit, and
// fails when the two disagree.
//
// A missing DELETE policy is the worst case — Postgres matches no rows, deletes
// nothing, and still answers 204, so the UI reports success while the row stays.

const browser = browserOperations();
const permitted = permittedByMigrations();

// Operations that are deliberately server-only. Anything not listed here must
// have a policy permitting it.
const SERVER_ONLY: Record<string, { cmds: string[]; why: string }> = {
  billing_accounts: {
    cmds: ["INSERT", "UPDATE", "DELETE"],
    why: "a client could POST its own credits/plan_tier; the service role creates the row",
  },
};

describe("the policy reader itself works", () => {
  // If these drift the whole suite below turns into a rubber stamp.
  it("sees the tables the browser uses", () => {
    expect(browser.size).toBeGreaterThan(8);
  });

  it("expands FOR ALL into all four commands", () => {
    expect([...(permitted.get("campaigns") ?? [])].sort()).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
  });

  it("honours a later migration that revokes an earlier blanket policy", () => {
    // 20260714120000 granted billing_accounts FOR ALL; 20260729120000 dropped
    // that and left SELECT only. Reading out of order would miss the revoke.
    expect([...(permitted.get("billing_accounts") ?? [])]).toEqual(["SELECT"]);
  });

  it("picks up the policies added for inbound numbers", () => {
    expect([...(permitted.get("inbound_numbers") ?? [])].sort()).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
  });
});

describe("every operation the browser issues is permitted by a policy", () => {
  const cases = [...browser.entries()].flatMap(([table, cmds]) =>
    [...cmds].map((cmd) => ({ table, cmd })),
  );

  it("has cases to check", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("$table allows $cmd", ({ table, cmd }) => {
    const allowed = permitted.get(table) ?? new Set<string>();
    if (!allowed.has(cmd)) {
      const exempt = SERVER_ONLY[table];
      expect(
        exempt?.cmds.includes(cmd) ? exempt.why : null,
        `${table} has no policy permitting ${cmd}, and it is not a declared server-only operation. ` +
          `Either add the policy or document why the browser must not do this.`,
      ).toBeTruthy();
      return;
    }
    expect(allowed).toContain(cmd);
  });
});

describe("a declared server-only operation really is absent from the browser", () => {
  // An exemption that stops being true is a silent hole, so prove the browser
  // no longer issues the operation it is exempted for.
  it.each(Object.entries(SERVER_ONLY).flatMap(([table, e]) => e.cmds.map((cmd) => ({ table, cmd }))))(
    "the browser does not $cmd $table",
    ({ table, cmd }) => {
      expect([...(browser.get(table) ?? [])]).not.toContain(cmd);
    },
  );
});

describe("owner-scoped writes cannot be aimed at another account", () => {
  const sql = readdirSync(join(process.cwd(), "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(process.cwd(), "supabase", "migrations", f), "utf8"))
    .join("\n");

  // An INSERT policy with no WITH CHECK accepts a row owned by anybody.
  const insertPolicies = [
    ...sql.matchAll(/CREATE\s+POLICY\s+(?:"[^"]+"|[\w]+)\s+ON\s+(?:public\.)?([a-z_]+)[^;]*?FOR\s+INSERT([^;]*);/gis),
  ].map((m) => ({ table: m[1], body: m[2] }));

  it("found INSERT policies to check", () => {
    expect(insertPolicies.length).toBeGreaterThan(0);
  });

  it.each(insertPolicies)("$table's INSERT policy constrains the row it accepts", ({ table, body }) => {
    // contact_submissions and signup_leads are public forms by design: anyone,
    // signed in or not, may submit one, so there is no owner to check against.
    if (["contact_submissions", "signup_leads"].includes(table)) return;
    expect(body).toMatch(/WITH\s+CHECK/i);
  });
});
