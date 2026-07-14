// Proration preview before an in-place plan change (VocalMax previewPlanChange).
// Body: { newPriceId } -> { chargeToday, currency, message } | { requiresCheckout }.
import { admin, stripe, getUserId, ensureUserAccount, json, corsHeaders } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);
    const { newPriceId } = await req.json();
    if (!newPriceId) return json({ error: "newPriceId is required." }, 400);

    const s = stripe();
    const supabase = admin();
    const account = await ensureUserAccount(supabase, userId);
    if (!account?.stripe_subscription_id || !account.stripe_customer_id) {
      return json({ requiresCheckout: true, message: "No active subscription — you'll go to checkout." });
    }

    const sub = await s.subscriptions.retrieve(account.stripe_subscription_id);
    const itemId = sub.items.data[0]?.id;
    const preview = await s.invoices.retrieveUpcoming({
      customer: account.stripe_customer_id,
      subscription: account.stripe_subscription_id,
      subscription_items: [{ id: itemId, price: newPriceId }],
      subscription_proration_behavior: "create_prorations",
    });
    const chargeToday = (preview.amount_due ?? 0) / 100;
    return json({
      chargeToday,
      currency: (preview.currency ?? "usd").toUpperCase(),
      message: `You'll be charged ${chargeToday.toFixed(2)} ${(preview.currency ?? "usd").toUpperCase()} today (prorated), then the new rate each cycle.`,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
