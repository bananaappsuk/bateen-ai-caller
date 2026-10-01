// This tenant's knowledge bases, with live indexing status from Retell.
//
// Retell holds every tenant's knowledge base on the one shared platform
// account, so its /list-knowledge-bases returns all of them. This function
// starts from our own ownership table and only enriches those rows, so another
// tenant's knowledge base can never reach the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface RetellKb {
  knowledge_base_id: string;
  status?: string;
  knowledge_base_sources?: unknown[];
  enable_auto_refresh?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("RETELL_API_KEY");
    if (!apiKey) return json({ error: "RETELL_API_KEY is not configured on the server." }, 500);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized." }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized." }, 401);

    const { data: owned } = await supabase
      .from("knowledge_bases")
      .select("id, retell_kb_id, name, status, source_count, auto_refresh, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const rows = owned ?? [];
    if (rows.length === 0) return json([]);

    // One upstream call, then match by id — cheaper than N get-knowledge-base
    // requests, and a Retell outage degrades to our stored status rather than
    // failing the page.
    let live = new Map<string, RetellKb>();
    try {
      const res = await fetch("https://api.retellai.com/list-knowledge-bases", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const all = (await res.json()) as RetellKb[];
        live = new Map((Array.isArray(all) ? all : []).map((k) => [k.knowledge_base_id, k]));
      }
    } catch (err) {
      console.error("[list-knowledge-bases] retell unreachable", err);
    }

    const merged = rows.map((r) => {
      const k = live.get(r.retell_kb_id as string);
      return {
        ...r,
        status: k?.status ?? r.status,
        source_count: k?.knowledge_base_sources?.length ?? r.source_count,
        auto_refresh: k?.enable_auto_refresh ?? r.auto_refresh,
        sources: k?.knowledge_base_sources ?? [],
        // Flags a knowledge base deleted directly in the Retell dashboard.
        missing_upstream: live.size > 0 && !k,
      };
    });
    return json(merged);
  } catch (e) {
    console.error("[list-knowledge-bases] threw", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
