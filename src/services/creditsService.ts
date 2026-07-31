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

export async function listTransactions(limit = 50): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Reserve one call's minimum charge atomically, right before dialing it. The
// reserve-call-credit edge function performs the check-and-decrement as a
// single Postgres statement (see the atomic_call_credit_reservation
// migration), so concurrent reservations — multiple calls in one batch,
// multiple browser tabs, or multiple campaigns for the same user — can never
// collectively spend more than the account holds. `authorized: false` means
// the balance can't cover another call right now.
export async function reserveCallCredit(): Promise<{ authorized: boolean; credits: number }> {
  const { data, error } = await supabase.functions.invoke<{
    authorized?: boolean;
    credits?: number;
    error?: string;
  }>("reserve-call-credit", { body: {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { authorized: data?.authorized ?? false, credits: data?.credits ?? 0 };
}

// Refunds a reservation for a call that never connected — mirrors VocalMax:
// only a connected call is ever charged, so an unconnected attempt gives back
// the hold taken by reserveCallCredit().
export async function releaseCallCredit(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>("release-call-credit", { body: {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Settle a completed call's real cost against its reservation + record a
// ledger entry, via the charge-call edge function (service role) — the
// balance/ledger must never be writable directly from the browser. Mirrors
// VocalMax: any connected call is charged, ~1 credit per minute (rounded up,
// min 1). Call reserveCallCredit() before dialing and this after the call
// connects; call releaseCallCredit() instead if it never connects.
export async function chargeForCall(
  minutes: number,
  meta: { leadName?: string | null; campaignId?: string | null },
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ credits?: number; error?: string }>("charge-call", {
    body: { minutes, leadName: meta.leadName ?? null },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
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
