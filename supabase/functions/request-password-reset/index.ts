// Password-reset request with explicit "no such account" feedback.
//
// The stock client flow (supabase.auth.resetPasswordForEmail) always reports
// success and never says whether the email exists, to prevent account
// enumeration. This product deliberately wants to tell the user when no account
// exists, so the existence check has to run server-side with the service-role
// key (never shippable to the browser). Flow:
//   1. Look up the email among auth users (service role).
//   2. If none  -> { exists: false }  (client shows "no account exists").
//   3. If found -> trigger the standard recovery email via GoTrue /recover
//      (built-in or custom SMTP mailer) and return { exists: true, sent: true }.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function emailExists(admin: ReturnType<typeof createClient>, email: string): Promise<boolean> {
  const target = email.trim().toLowerCase();
  // Scan auth users a page at a time (listUsers has no email filter). Capped so
  // a huge directory can't turn one reset request into an unbounded scan.
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    if (users.some((u) => (u.email ?? "").toLowerCase() === target)) return true;
    if (users.length < perPage) break; // last page reached
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    if (!(await emailExists(admin, email))) {
      return json({ exists: false });
    }

    // User exists — send the standard recovery email through GoTrue's mailer.
    const url = new URL(`${SUPABASE_URL}/auth/v1/recover`);
    if (redirectTo && typeof redirectTo === "string") url.searchParams.set("redirect_to", redirectTo);
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const r = await fetch(url.toString(), {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) {
      console.error("recover failed", r.status, await r.text());
      return json({ error: "Could not send the reset email. Please try again shortly." }, 502);
    }
    return json({ exists: true, sent: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
