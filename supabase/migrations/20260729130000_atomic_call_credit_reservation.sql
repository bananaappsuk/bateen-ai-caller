-- Atomic credit reservation for outbound calls.
--
-- Problem: the dialer previously checked "credits > 0" once per batch (up to
-- `concurrency` calls) via a plain SELECT, then dispatched every call in the
-- batch against that one stale snapshot. That check-then-spend gap is a
-- classic race: it doesn't protect against several calls in the same batch,
-- successive ticks 10s apart, multiple browser tabs on the same campaign, or
-- multiple campaigns the same user runs concurrently, all of which read the
-- same balance before any of them had deducted it. The actual charge only
-- ever landed later (post hoc, based on call duration), so nothing stopped
-- the balance from going negative in practice (it was floored client-side,
-- masking the overspend rather than preventing it).
--
-- Fix: every outbound call now reserves its minimum charge (1 credit) with a
-- single atomic UPDATE before it is dialed, then that reservation is either
-- topped up to the real per-minute cost (call connected) or refunded (call
-- never connected) once the outcome is known. See reserve-call-credit,
-- charge-call, and release-call-credit in supabase/functions.
--
-- Why this is race-free: each function performs its check-and-decrement (or
-- delta-adjustment) as ONE UPDATE statement. Postgres takes a row lock on the
-- matched billing_accounts row for the duration of that UPDATE; a second,
-- concurrent call targeting the same row blocks until the first transaction
-- commits, and then (under the default READ COMMITTED isolation Postgres/
-- Supabase uses) re-evaluates its WHERE clause against the now-current row
-- via EvalPlanQual before proceeding. So two simultaneous reservations can
-- never both succeed off a balance that can only cover one of them — there
-- is no window between "check" and "spend" for another caller to land in.
--
-- Only service_role may call these: both edge functions resolve p_user_id
-- from the caller's verified JWT, never from client input. If EXECUTE were
-- granted to `authenticated`, any signed-in user could call these functions
-- directly with an arbitrary p_user_id and drain or credit someone else's
-- balance — the same class of issue the billing-tables RLS lockdown
-- (20260729120000_billing_tables_readonly_rls.sql) closed for direct table
-- writes.

CREATE OR REPLACE FUNCTION public.reserve_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS TABLE(ok boolean, credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_credits integer;
BEGIN
  UPDATE public.billing_accounts
  SET credits = credits - p_amount
  WHERE user_id = p_user_id AND credits >= p_amount
  RETURNING credits INTO v_credits;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_credits;
  ELSE
    SELECT b.credits INTO v_credits FROM public.billing_accounts b WHERE b.user_id = p_user_id;
    RETURN QUERY SELECT false, COALESCE(v_credits, 0);
  END IF;
END;
$$;

-- Unconditional atomic delta, floored at 0. Used both to top up a reservation
-- to the real call cost (negative delta) and to refund an unused reservation
-- (positive delta) — never blocks, since the call it's accounting for has
-- already happened either way.
CREATE OR REPLACE FUNCTION public.adjust_credits(p_user_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_credits integer;
BEGIN
  UPDATE public.billing_accounts
  SET credits = GREATEST(0, credits + p_delta)
  WHERE user_id = p_user_id
  RETURNING credits INTO v_credits;
  RETURN COALESCE(v_credits, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_credits(uuid, integer) TO service_role;
