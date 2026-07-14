// Credits / billing data-access (Supabase). Pre-auth this reads/writes the
// singleton billing account (user_id IS NULL); the auth phase switches to
// per-user rows. Stripe checkout/portal are invoked via edge functions.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BillingAccount = Database["public"]["Tables"]["billing_accounts"]["Row"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];

// RLS returns only the current user's account; create it on first use.
export async function getBillingAccount(): Promise<BillingAccount | null> {
  const { data, error } = await supabase.from("billing_accounts").select("*").limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: insErr } = await supabase
    .from("billing_accounts")
    .insert({ credits: 0 })
    .select()
    .single();
  if (insErr) {
    const { data: retry } = await supabase.from("billing_accounts").select("*").limit(1).maybeSingle();
    return retry ?? null;
  }
  return created;
}

export async function getCredits(): Promise<number> {
  const account = await getBillingAccount();
  return account?.credits ?? 0;
}

export async function listTransactions(limit = 50): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Deduct credits for a completed call + record a ledger entry. Mirrors VocalMax:
// any connected call is charged, ~1 credit per minute (rounded up, min 1).
export async function chargeForCall(
  minutes: number,
  meta: { leadName?: string | null; campaignId?: string | null },
): Promise<void> {
  const credits = Math.max(1, Math.ceil(minutes));
  const account = await getBillingAccount();
  if (!account) return;
  await supabase
    .from("billing_accounts")
    .update({ credits: Math.max(0, (account.credits ?? 0) - credits) })
    .eq("id", account.id);
  await supabase.from("credit_transactions").insert({
    type: "call",
    credits: -credits,
    cost_cents: credits * 28,
    description: `Call to ${meta.leadName ?? "lead"}`,
  });
}

// Invoke a Stripe edge function and follow the returned checkout/portal URL.
export async function redirectToStripe(
  fn: "create-checkout-session" | "create-topup-checkout" | "create-portal-session",
  body: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(fn, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("No checkout URL returned.");
  window.location.href = data.url;
}

// In-place plan change for an existing subscriber (proration handled by Stripe).
export async function changePlan(
  newPriceId: string,
  tier: string,
  monthlyCredits: number,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ message?: string; error?: string }>(
    "change-subscription-plan",
    { body: { newPriceId, tier, monthlyCredits } },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.message ?? "Plan changed.";
}

// Proration preview before an in-place plan change.
export async function previewChange(newPriceId: string): Promise<{
  chargeToday?: number;
  currency?: string;
  message?: string;
  requiresCheckout?: boolean;
}> {
  const { data, error } = await supabase.functions.invoke<{
    chargeToday?: number;
    currency?: string;
    message?: string;
    requiresCheckout?: boolean;
    error?: string;
  }>("preview-plan-change", { body: { newPriceId } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data ?? {};
}
