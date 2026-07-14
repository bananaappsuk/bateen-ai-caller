// Credit top-up checkout (VocalMax createTopupCheckoutSession).
// Body: { credits, successUrl, cancelUrl } -> { url }. $0.28 per credit.
import { admin, stripe, ensureCustomer, getUserId, json, corsHeaders } from "../_shared/billing.ts";

const CREDIT_PRICE_CENTS = 28;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { credits, successUrl, cancelUrl } = await req.json();
    const qty = Number(credits);
    if (!qty || qty < 10 || qty > 100000) {
      return json({ error: "Credits must be between 10 and 100,000." }, 400);
    }
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);
    const s = stripe();
    const supabase = admin();
    const customer = await ensureCustomer(supabase, s, userId);

    const { data: order } = await supabase
      .from("credit_orders")
      .insert({ user_id: userId, credits: qty, amount_cents: qty * CREDIT_PRICE_CENTS, status: "pending" })
      .select()
      .single();

    const session = await s.checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: CREDIT_PRICE_CENTS,
            product_data: { name: `${qty} calling credits` },
          },
          quantity: qty,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { kind: "topup", credits: String(qty), orderId: order?.id ?? "" },
    });

    if (order) {
      await supabase.from("credit_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    }
    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
