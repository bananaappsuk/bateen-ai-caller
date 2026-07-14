// Public landing-page live-demo capture (VocalMax signupLeads + "our AI rings you
// in seconds"). Body: { phone, name? }. Stores a signup_lead and, if a demo agent
// + number are configured, places an immediate Retell call.
// NOTE: add reCAPTCHA + rate-limiting before exposing publicly at scale.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone, name } = await req.json();
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
      return json({ error: "Enter a valid phone number in international format (e.g. +447700900123)." }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Rate-limit: at most 2 demo requests per number per hour (basic abuse guard).
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabase
      .from("signup_leads")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 2) {
      return json({ error: "Too many demo requests for this number — please try again later." }, 429);
    }

    await supabase.from("signup_leads").insert({ phone, name: name || null, source: "live_demo" });

    const key = Deno.env.get("RETELL_API_KEY");
    const agent = Deno.env.get("DEMO_AGENT_ID");
    const from = Deno.env.get("DEMO_FROM_NUMBER");
    let called = false;
    if (key && agent && from) {
      try {
        const r = await fetch("https://api.retellai.com/v2/create-phone-call", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from_number: from, to_number: phone, override_agent_id: agent }),
        });
        called = r.ok;
      } catch {
        // non-fatal
      }
    }
    return json({ ok: true, called });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
