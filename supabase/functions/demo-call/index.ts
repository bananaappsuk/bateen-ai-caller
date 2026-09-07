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

const UK_E164 = /^\+44\d{9,10}$/;

// UK-only normaliser — keep in sync with src/lib/phone.ts.
function normalizeUkPhone(raw: string): string | null {
  let p = raw.trim().replace(/[\s()\-.']/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = "+" + p.slice(2);
  p = p.replace(/^\+440+/, "+44");
  if (!p.startsWith("+")) {
    const digits = p.replace(/\D/g, "");
    if (!digits) return null;
    p = digits.startsWith("44") ? `+${digits}` : `+44${digits.replace(/^0/, "")}`;
  }
  if (p.startsWith("+44")) return UK_E164.test(p) ? p : null;
  return /^\+[1-9]\d{6,14}$/.test(p) ? p : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone: rawPhone, name } = await req.json();
    // This is a public endpoint, so it normalises the number itself rather than
    // trusting the caller to have done it. Mirrors src/lib/phone.ts (edge
    // functions can't import from src/): accept any way a UK number is written.
    const phone = normalizeUkPhone(String(rawPhone ?? ""));
    if (!phone) {
      return json({ error: "Enter a valid UK phone number, e.g. 07700 900123." }, 400);
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

    // Admin-configured agent/number (AdminPage "Demo Call Settings") take
    // priority over the DEMO_AGENT_ID / DEMO_FROM_NUMBER secrets, which now
    // only serve as a fallback for a fresh deploy with nothing configured yet.
    const { data: config } = await supabase
      .from("demo_call_config")
      .select("agent_id, phone_number")
      .eq("id", true)
      .maybeSingle();

    const key = Deno.env.get("RETELL_API_KEY");
    const agent = config?.agent_id || Deno.env.get("DEMO_AGENT_ID");
    const from = config?.phone_number || Deno.env.get("DEMO_FROM_NUMBER");
    let called = false;
    if (key && agent && from) {
      try {
        const r = await fetch("https://api.retellai.com/v2/create-phone-call", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from_number: from, to_number: phone, override_agent_id: agent }),
        });
        called = r.ok;
        if (!r.ok) console.error("Retell create-phone-call failed", r.status, await r.text());
      } catch (err) {
        console.error("Retell create-phone-call threw", err);
      }
    }
    return json({ ok: true, called });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
