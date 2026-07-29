// In-place subscription plan change with proration (VocalMax changeSubscriptionPlan).
// Body: { newPriceId, tier, monthlyCredits } -> { message }.
import {
  admin,
  stripe,
  getUserId,
  ensureUserAccount,
  isMissingStripeResource,
  json,
  corsHeaders,
} from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);
    const { newPriceId, tier, monthlyCredits } = await req.json();
    if (!newPriceId) return json({ error: "newPriceId is required." }, 400);

    const s = stripe();
    const supabase = admin();
    const account = await ensureUserAccount(supabase, userId);
    if (!account?.stripe_subscription_id) {
      return json({ error: "No active subscription — subscribe via checkout first." }, 400);
    }

    let sub;
    try {
      sub = await s.subscriptions.retrieve(account.stripe_subscription_id);
    } catch (e) {
      // Stale id from before a test→live key switch (or deleted in Stripe) —
      // same actionable message as never having subscribed.
      if (isMissingStripeResource(e)) {
        return json({ error: "No active subscription — subscribe via checkout first." }, 400);
      }
      throw e;
    }
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return json({ error: "Subscription has no line item to update." }, 400);

    await s.subscriptions.update(account.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
      metadata: { tier: tier ?? "", monthlyCredits: String(monthlyCredits ?? "") },
    });

    await supabase.from("billing_accounts").update({ plan_tier: tier ?? account.plan_tier }).eq("id", account.id);
    return json({ message: `Plan changed to ${tier ?? "the selected plan"}.` });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
