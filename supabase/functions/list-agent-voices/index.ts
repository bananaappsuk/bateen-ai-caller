// Voice list for the agent builder: every stock Retell voice, plus only the
// caller's own cloned voices.
//
// Why this exists: all tenants share one Retell account, so /list-voices
// returns every tenant's clone (voice_type "custom") to everyone. Filtering on
// the client would still ship other tenants' voice names to the browser, so the
// filtering happens here. Stock voices come back as voice_type "standard".
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface RetellVoice {
  voice_id: string;
  voice_type?: string;
  [key: string]: unknown;
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

    const [voicesRes, ownedRes] = await Promise.all([
      fetch("https://api.retellai.com/list-voices", { headers: { Authorization: `Bearer ${apiKey}` } }),
      supabase.from("custom_voices").select("retell_voice_id").eq("user_id", userId),
    ]);

    if (!voicesRes.ok) {
      console.error("[list-agent-voices] retell failed", voicesRes.status, await voicesRes.text());
      return json({ error: "Could not load voices from Retell." }, 502);
    }
    const all = (await voicesRes.json()) as RetellVoice[];
    const owned = new Set((ownedRes.data ?? []).map((r) => r.retell_voice_id as string));

    const voices = (Array.isArray(all) ? all : []).filter(
      (v) => v.voice_type !== "custom" || owned.has(v.voice_id),
    );
    return json(voices);
  } catch (e) {
    console.error("[list-agent-voices] threw", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
