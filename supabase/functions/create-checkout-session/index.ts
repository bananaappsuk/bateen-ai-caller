// Subscription checkout (VocalMax createCheckoutSession).
// Body: { priceId, successUrl, cancelUrl, trialDays? } -> { url }.
import { admin, stripe, ensureCustomer, getUserId, json, corsHeaders } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);
    const { priceId, successUrl, cancelUrl, trialDays, tier, monthlyCredits } = await req.json();
    if (!priceId) return json({ error: "priceId is required." }, 400);
    const s = stripe();
    const supabase = admin();
    const customer = await ensureCustomer(supabase, s, userId);
    const metadata = { tier: tier ?? "", monthlyCredits: String(monthlyCredits ?? "") };
    const subscriptionData: Record<string, unknown> = { metadata };
    if (trialDays) subscriptionData.trial_period_days = Number(trialDays);
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: subscriptionData,
      metadata,
    });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
