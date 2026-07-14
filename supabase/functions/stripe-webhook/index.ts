// Stripe webhook — credits the account on payment and tracks subscription state.
// Handles top-up payments, new subscriptions, recurring invoices (monthly credit
// grant) and subscription updates/cancellations. Needs STRIPE_WEBHOOK_SECRET.
import { admin, stripe, accountByCustomer, json } from "../_shared/billing.ts";

async function grantCredits(
  supabase: ReturnType<typeof admin>,
  accountId: string,
  current: number,
  credits: number,
  type: string,
  description: string,
  reference?: string,
) {
  await supabase.from("billing_accounts").update({ credits: current + credits }).eq("id", accountId);
  await supabase.from("credit_transactions").insert({
    type,
    credits,
    description,
    stripe_reference: reference ?? null,
  });
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  const s = stripe();
  let event;
  try {
    event = await s.webhooks.constructEventAsync(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    return json({ error: `Webhook signature verification failed: ${e instanceof Error ? e.message : e}` }, 400);
  }

  const supabase = admin();
  const customerId = ((event.data.object as Record<string, unknown>).customer as string) ?? null;
  const account = customerId ? await accountByCustomer(supabase, customerId) : null;
  if (!account) return json({ received: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Record<string, unknown>;
      const meta = (session.metadata ?? {}) as Record<string, string>;
      if (meta.kind === "topup") {
        const credits = Number(meta.credits || 0);
        await grantCredits(supabase, account.id, account.credits ?? 0, credits, "topup", `Top-up ${credits} credits`, session.id as string);
        if (meta.orderId) await supabase.from("credit_orders").update({ status: "paid" }).eq("id", meta.orderId);
      } else if (session.mode === "subscription") {
        const monthly = Number(meta.monthlyCredits || 0);
        await supabase
          .from("billing_accounts")
          .update({
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            plan_tier: meta.tier ?? account.plan_tier,
          })
          .eq("id", account.id);
        if (monthly > 0) {
          await grantCredits(supabase, account.id, account.credits ?? 0, monthly, "subscription", `${meta.tier ?? "Plan"} monthly credits`, session.subscription as string);
        }
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Record<string, unknown>;
      // Recurring renewals only (first invoice handled by checkout.session.completed).
      if (invoice.billing_reason === "subscription_cycle") {
        const sub = await s.subscriptions.retrieve(invoice.subscription as string);
        const monthly = Number((sub.metadata?.monthlyCredits as string) || 0);
        if (monthly > 0) {
          await grantCredits(supabase, account.id, account.credits ?? 0, monthly, "subscription", "Monthly credits renewal", invoice.id as string);
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Record<string, unknown>;
      await supabase
        .from("billing_accounts")
        .update({
          subscription_status: sub.status as string,
          stripe_subscription_id: sub.id as string,
          ...(event.type === "customer.subscription.deleted" ? { plan_tier: null } : {}),
        })
        .eq("id", account.id);
      break;
    }
  }

  return json({ received: true });
});
