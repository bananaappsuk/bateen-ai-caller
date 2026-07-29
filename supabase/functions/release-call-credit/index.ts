// Refunds a call's reserved credit when it never connected (failed,
// no-answer, timed out, or the dial attempt itself errored) — only a
// connected call is ever charged, so an unconnected attempt must give back
// the reservation taken by reserve-call-credit before it was dialed.
// Uses the same atomic adjust_credits() Postgres function as charge-call's
// settle step, just with a positive delta.
// Body: {} -> { credits }.
import { admin, getUserId, json, corsHeaders, CALL_RESERVE_CREDITS, errorMessage } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let userId: string | null = null;
  try {
    userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);

    const supabase = admin();
    console.log(`[release-call-credit] user=${userId} calling adjust_credits RPC (p_delta=${CALL_RESERVE_CREDITS})`);
    const { data, error } = await supabase.rpc("adjust_credits", {
      p_user_id: userId,
      p_delta: CALL_RESERVE_CREDITS,
    });
    if (error) {
      console.error(`[release-call-credit] adjust_credits RPC failed for user=${userId}: ${JSON.stringify(error)}`);
      throw error;
    }
    console.log(`[release-call-credit] user=${userId} released — new balance=${data}`);

    return json({ credits: data as number });
  } catch (e) {
    console.error(`[release-call-credit] unhandled exception for user=${userId ?? "unknown"}:`, e);
    return json({ error: errorMessage(e) }, 500);
  }
});
