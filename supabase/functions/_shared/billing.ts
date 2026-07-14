// Shared Stripe + billing helpers. Each billing account is per-user; the
// checkout / top-up / portal functions identify the user from the request JWT,
// and the webhook maps Stripe customers back to accounts.
import Stripe from "npm:stripe@17";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
export async function ensureCustomer(supabase: SupabaseClient, s: Stripe, userId: string): Promise<string> {
  const account = await ensureUserAccount(supabase, userId);
  if (account?.stripe_customer_id) return account.stripe_customer_id;
  const customer = await s.customers.create({ metadata: { userId } });
  if (account) {
    await supabase.from("billing_accounts").update({ stripe_customer_id: customer.id }).eq("id", account.id);
  }
  return customer.id;
}
