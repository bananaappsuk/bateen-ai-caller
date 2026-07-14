// Stripe billing portal (VocalMax createCustomerPortalSession).
// Body: { returnUrl } -> { url }.
import { admin, stripe, ensureCustomer, getUserId, json, corsHeaders } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);
    const { returnUrl } = await req.json();
    const s = stripe();
    const supabase = admin();
    const customer = await ensureCustomer(supabase, s, userId);
    const session = await s.billingPortal.sessions.create({ customer, return_url: returnUrl });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
