// Atomically reserves the minimum charge (1 credit) for one outbound call,
// right before it is dialed. This is what makes per-call credit authorization
// concurrency-safe: dialerEngine.ts used to check the balance once per batch
// and dispatch every call in that batch against the same stale snapshot —
// a race across calls in the batch, across ticks, across browser tabs, and
// across campaigns for the same user. Calling this immediately before every
// single call closes that gap, because reserve_credits() performs the
// check-and-decrement as one atomic Postgres UPDATE (see the migration
// 20260729130000_atomic_call_credit_reservation.sql for why that's race-free,
// and 20260729170000 for a real bug that briefly made every call to it fail).
// Body: {} -> { authorized, credits }.
import {
  admin,
  getUserId,
  ensureUserAccount,
  json,
  corsHeaders,
  CALL_RESERVE_CREDITS,
  errorMessage,
} from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let userId: string | null = null;
  try {
    userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized." }, 401);

    const supabase = admin();
    // Make sure the account row exists (new users start at 0 credits, so a
    // first-ever reservation will simply come back unauthorized).
    await ensureUserAccount(supabase, userId);

    console.log(
      `[reserve-call-credit] user=${userId} calling reserve_credits RPC (p_amount=${CALL_RESERVE_CREDITS})`,
    );
    const { data, error } = await supabase
      .rpc("reserve_credits", { p_user_id: userId, p_amount: CALL_RESERVE_CREDITS })
      .single<{ ok: boolean; credits: number }>();

    if (error) {
      console.error(
        `[reserve-call-credit] reserve_credits RPC failed for user=${userId}: status=${
          (error as { code?: string }).code ?? "n/a"
        } body=${JSON.stringify(error)}`,
      );
      throw error;
    }

    console.log(`[reserve-call-credit] user=${userId} succeeded: ${JSON.stringify(data)}`);
    return json({ authorized: data?.ok ?? false, credits: data?.credits ?? 0 });
  } catch (e) {
    console.error(`[reserve-call-credit] unhandled exception for user=${userId ?? "unknown"}:`, e);
    return json({ error: errorMessage(e) }, 500);
  }
});
