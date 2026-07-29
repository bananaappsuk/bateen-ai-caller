// Generic HTTP/auth helpers shared by edge functions that aren't billing —
// phone-number ownership functions in particular. Mirrors the shape of
// _shared/billing.ts's non-Stripe helpers.
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

// Resolve the calling user from the request's bearer token. Every
// phone-number action scopes its DB reads/writes to this id — never a
// client-supplied one — so a tenant can only ever touch their own rows.
export async function getUserId(req: Request): Promise<string | null> {
  const authz = req.headers.get("Authorization");
  if (!authz) return null;
  const token = authz.replace(/^Bearer\s+/i, "");
  const { data } = await admin().auth.getUser(token);
  return data.user?.id ?? null;
}
