import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { permittedByMigrations } from "./rlsPolicies";

// Proves the migration replay in rlsPolicies.ts matches the real database,
// because a policy reader nobody has checked against Postgres is worse than no
// reader at all — it reports confidence it has not earned.
//
// Skipped unless pointed at a snapshot, so CI stays offline. To refresh one:
//
//   SELECT c.relname AS table_name, c.relrowsecurity AS rls_on,
//          COALESCE(string_agg(DISTINCT p.cmd, ',' ORDER BY p.cmd), '') AS cmds
//   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
//   LEFT JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname
//   WHERE n.nspname='public' AND c.relkind='r'
//   GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;
//
// then: LIVE_POLICIES=/path/to/snapshot.json npx vitest run rlsPolicies.live
const snapshot = process.env.LIVE_POLICIES;

describe.skipIf(!snapshot)("migration replay agrees with the live database", () => {
  it("every table permits exactly the commands the migrations say", () => {
    const live: Array<{ table_name: string; cmds: string }> = JSON.parse(readFileSync(snapshot!, "utf8"));
    const replay = permittedByMigrations();
    const expand = (cmds: string) =>
      [...new Set((cmds || "").split(",").filter(Boolean).flatMap((c) =>
        c === "ALL" ? ["SELECT", "INSERT", "UPDATE", "DELETE"] : [c]))].sort().join(",");

    const diffs = live
      .map((r) => ({
        table: r.table_name,
        live: expand(r.cmds),
        replay: [...(replay.get(r.table_name) ?? [])].sort().join(","),
      }))
      .filter((r) => r.live !== r.replay);

    expect(diffs, `replay disagrees with the database for: ${JSON.stringify(diffs, null, 2)}`).toEqual([]);
  });
});
