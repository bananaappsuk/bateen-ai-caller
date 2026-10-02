// Replays the migrations to work out which commands RLS permits on each table.
//
// A union of every CREATE POLICY in the repo would be wrong: the lockdown
// migration drops every existing policy on a table before recreating it, and
// the billing migration later drops that blanket policy and replaces it with a
// SELECT-only one. Reading them out of order would claim `billing_accounts`
// still allows INSERT, which is exactly the permission it was written to remove.
// So this applies CREATE and DROP in filename order, the order Supabase runs
// them in, and models the two dynamic forms this repo uses.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Cmd = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
const ALL: Cmd[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

/** table -> policy name -> commands it permits */
type State = Map<string, Map<string, Set<Cmd>>>;

const POLICY_NAME = String.raw`(?:"[^"]+"|[\w]+)`;
const unquote = (s: string) => s.replace(/^"|"$/g, "");

function create(state: State, table: string, name: string, cmd: string) {
  if (!state.has(table)) state.set(table, new Map());
  const cmds = new Set<Cmd>(cmd.toUpperCase() === "ALL" ? ALL : [cmd.toUpperCase() as Cmd]);
  state.get(table)!.set(unquote(name), cmds);
}

function drop(state: State, table: string, name: string) {
  state.get(table)?.delete(unquote(name));
}

/** Applies one `DO $$ ... $$` block that loops over a literal table array. */
function applyDoBlock(state: State, block: string) {
  const arr = block.match(/FOREACH\s+\w+\s+IN\s+ARRAY\s+ARRAY\[([^\]]+)\]/is);
  if (!arr) {
    // A block may instead clear one named table — the lockdown does this for
    // webhook_events, which has no per-user column and so gets no policy at
    // all. Missing this left the reader claiming a SELECT policy that the
    // migration had removed.
    const named = block.match(/FOR\s+pol\s+IN\s+SELECT\s+policyname[^;]*?tablename\s*=\s*'([a-z_]+)'/is);
    if (named) state.set(named[1], new Map());
    return;
  }
  const tables = [...arr[1].matchAll(/'([a-z_]+)'/gi)].map((m) => m[1]);

  // Statements in textual order: a drop-all, a named drop, or a create.
  const steps = [
    ...block.matchAll(
      new RegExp(
        String.raw`(?<dropAll>FOR\s+pol\s+IN\s+SELECT\s+policyname)` +
          String.raw`|DROP\s+POLICY\s+IF\s+EXISTS\s+(?<dropName>` + POLICY_NAME + String.raw`)\s+ON\s+public\.%I` +
          String.raw`|CREATE\s+POLICY\s+(?<createName>` + POLICY_NAME + String.raw`)\s+ON\s+public\.%I\s+FOR\s+(?<cmd>ALL|SELECT|INSERT|UPDATE|DELETE)`,
        "gis",
      ),
    ),
  ];

  for (const t of tables) {
    for (const s of steps) {
      const g = s.groups!;
      if (g.dropAll) state.set(t, new Map());
      else if (g.dropName) drop(state, t, g.dropName);
      else if (g.createName) create(state, t, g.createName, g.cmd);
    }
  }
}

export function permittedByMigrations(
  dir = join(process.cwd(), "supabase", "migrations"),
): Map<string, Set<Cmd>> {
  const state: State = new Map();

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");

    // Dynamic blocks first, in place, then the plain statements around them.
    const blocks = [...sql.matchAll(/DO\s+\$\$(.*?)\$\$/gis)];
    for (const b of blocks) applyDoBlock(state, b[1]);

    const outside = sql.replace(/DO\s+\$\$.*?\$\$/gis, "");
    for (const m of outside.matchAll(
      new RegExp(
        String.raw`(?:DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(?<dropName>` + POLICY_NAME + String.raw`)\s+ON\s+(?:public\.)?(?<dropTable>[a-z_]+))` +
          String.raw`|(?:CREATE\s+POLICY\s+(?<createName>` + POLICY_NAME + String.raw`)\s+ON\s+(?:public\.)?(?<createTable>[a-z_]+)(?:\s+AS\s+\w+)?(?:\s+TO\s+[\w,\s]+?)?\s+FOR\s+(?<cmd>ALL|SELECT|INSERT|UPDATE|DELETE))`,
        "gis",
      ),
    )) {
      const g = m.groups!;
      if (g.dropName) drop(state, g.dropTable, g.dropName);
      else create(state, g.createTable, g.createName, g.cmd);
    }
  }

  // Flatten to table -> permitted commands.
  const out = new Map<string, Set<Cmd>>();
  for (const [table, policies] of state) {
    const cmds = new Set<Cmd>();
    for (const set of policies.values()) for (const c of set) cmds.add(c);
    out.set(table, cmds);
  }
  return out;
}

/** Every data operation the browser issues, per table, read from src/. */
export function browserOperations(root = join(process.cwd(), "src")): Map<string, Set<Cmd>> {
  const ops = new Map<string, Set<Cmd>>();
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return /\.tsx?$/.test(e.name) && !e.name.includes(".test.") ? [p] : [];
    });

  for (const file of walk(root)) {
    const s = readFileSync(file, "utf8");
    for (const m of s.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)) {
      const tail = s.slice(m.index! + m[0].length, m.index! + m[0].length + 260);
      const op = tail.match(/\.(insert|upsert|update|delete|select)\s*\(/);
      if (!op) continue;
      const cmd = (op[1].toUpperCase() === "UPSERT" ? "INSERT" : op[1].toUpperCase()) as Cmd;
      if (!ops.has(m[1])) ops.set(m[1], new Set());
      ops.get(m[1])!.add(cmd);
    }
  }
  return ops;
}
