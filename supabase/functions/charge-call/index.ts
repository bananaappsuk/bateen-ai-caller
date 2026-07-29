// Settles credits for a completed, connected call (VocalMax: any connected
// call is charged, ~1 credit per minute, rounded up, min 1). By the time this
// runs, reserve-call-credit already atomically held back CALL_RESERVE_CREDITS
// (1) for this call before it was dialed — this only needs to collect the
// (non-negative) difference between that reservation and the real cost, via
// the same atomic adjust_credits() Postgres function, so the top-up can never
// race with another call's reservation/settlement on the same account.
// Body: { minutes, leadName? } -> { credits } (the new balance).
import { admin, getUserId, json, corsHeaders, CALL_RESERVE_CREDITS, errorMessage } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let userId: string | null = null;
  try {
    userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);

    const { minutes, leadName } = await req.json();
    const mins = Number(minutes);
    if (!mins || mins <= 0) return json({ error: "minutes must be a positive number." }, 400);

    const supabase = admin();
    const cost = Math.max(1, Math.ceil(mins));
    const additional = cost - CALL_RESERVE_CREDITS; // always >= 0, since cost >= 1 == CALL_RESERVE_CREDITS

    console.log(
      `[charge-call] user=${userId} lead="${leadName ?? "lead"}" minutes=${mins} cost=${cost} calling adjust_credits RPC (p_delta=${-additional})`,
    );
    const { data: balance, error } = await supabase.rpc("adjust_credits", {
      p_user_id: userId,
      p_delta: -additional,
    });
    if (error) {
      console.error(`[charge-call] adjust_credits RPC failed for user=${userId}: ${JSON.stringify(error)}`);
      throw error;
    }
    console.log(`[charge-call] user=${userId} settled — new balance=${balance}`);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      type: "call",
      credits: -cost,
      cost_cents: cost * 28,
      description: `Call to ${leadName || "lead"}`,
    });

    return json({ credits: balance as number });
  } catch (e) {
    console.error(`[charge-call] unhandled exception for user=${userId ?? "unknown"}:`, e);
    return json({ error: errorMessage(e) }, 500);
  }
});
