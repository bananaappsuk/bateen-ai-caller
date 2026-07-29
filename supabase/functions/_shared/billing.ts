// Shared Stripe + billing helpers. Each billing account is per-user; the
// checkout / top-up / portal functions identify the user from the request JWT,
// and the webhook maps Stripe customers back to accounts.
import Stripe from "npm:stripe@17";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credits held per outbound call at dispatch time, before its real cost is
// known (see reserve-call-credit / charge-call / release-call-credit).
export const CALL_RESERVE_CREDITS = 1;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function stripe(): Stripe {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
}

// Extracts a readable message from any thrown value. `e instanceof Error ?
// e.message : String(e)` looks safe but silently degrades to the literal
// string "[object Object]" for PostgrestError/Postgres RPC errors — those
// are plain objects with a `.message` field, not `Error` instances — which
// is exactly what made reserve-call-credit's real "column reference
// \"credits\" is ambiguous" failure invisible, surfacing only as a generic
// 500 with an unreadable body.
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// True for Stripe's "resource_missing" error — the shape a stale id (e.g.
// stored from before a test→live key switch) throws when retrieved under
// the current mode. Used to turn that into an actionable message instead of
// a raw "No such subscription: '...'" crash.
export function isMissingStripeResource(e: unknown): boolean {
  return (e as { code?: string } | undefined)?.code === "resource_missing";
}

// Resolve the calling user from the request's bearer token.
export async function getUserId(req: Request): Promise<string | null> {
  const authz = req.headers.get("Authorization");
  if (!authz) return null;
  const token = authz.replace(/^Bearer\s+/i, "");
  const { data } = await admin().auth.getUser(token);
  return data.user?.id ?? null;
}

export async function ensureUserAccount(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("billing_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from("billing_accounts")
    .insert({ user_id: userId, credits: 0 })
    .select()
    .single();
  return created;
}

export async function accountByCustomer(supabase: SupabaseClient, customerId: string) {
  const { data } = await supabase
    .from("billing_accounts")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data;
}

// Return the user's Stripe customer id, creating the customer on first use.
//
// Stripe customers (like subscriptions and prices) are scoped per API mode —
// a customer id created while STRIPE_SECRET_KEY was a test key does not
// exist once the key is switched to live (and vice versa), even though it's
// the same Stripe account. A stored id from before such a switch, or one
// deleted directly in the Stripe dashboard, must not be trusted blindly —
// verify it still resolves in the *current* mode before reusing it, and
// silently mint + store a fresh one if not. This makes checkout/portal
// self-heal for any account left with a stale id, instead of every
// checkout attempt failing with "No such customer: '...'".
export async function ensureCustomer(supabase: SupabaseClient, s: Stripe, userId: string): Promise<string> {
  const account = await ensureUserAccount(supabase, userId);
  if (account?.stripe_customer_id) {
    try {
      const existing = await s.customers.retrieve(account.stripe_customer_id);
      if (!existing.deleted) return account.stripe_customer_id;
    } catch {
      // Not found in this mode, or otherwise unusable — fall through and
      // mint a replacement instead of failing every checkout on this account.
    }
  }
  const customer = await s.customers.create({ metadata: { userId } });
  if (account) {
    await supabase.from("billing_accounts").update({ stripe_customer_id: customer.id }).eq("id", account.id);
  }
  return customer.id;
}
