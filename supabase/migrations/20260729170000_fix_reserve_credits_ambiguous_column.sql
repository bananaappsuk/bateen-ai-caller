-- Fix reserve_credits(): its own RETURNS TABLE(ok boolean, credits integer)
-- signature implicitly declares a `credits` OUT parameter inside the
-- function body, which collides with billing_accounts.credits — every bare
-- reference to `credits` in the UPDATE (SET/WHERE/RETURNING) was ambiguous
-- between "the table column" and "the OUT parameter", so every call failed
-- at runtime with:
--   ERROR: 42702: column reference "credits" is ambiguous
-- This never showed up at CREATE FUNCTION time (Postgres doesn't deeply
-- validate a plpgsql body's inner SQL until it actually executes), so it
-- shipped silently and broke every outbound call's credit reservation —
-- reserve-call-credit returned 500 for every campaign dispatch, which
-- dialerEngine.ts then surfaced as the generic "Edge Function returned a
-- non-2xx status code" before the Retell call was ever attempted.
--
-- Fix: qualify every table-column reference to billing_accounts with an
-- alias so it can never be confused with the function's own `credits` OUT
-- parameter. adjust_credits() is unaffected — it RETURNS a scalar integer,
-- so it has no OUT parameter named `credits` to collide with.
CREATE OR REPLACE FUNCTION public.reserve_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS TABLE(ok boolean, credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_credits integer;
BEGIN
  UPDATE public.billing_accounts AS b
  SET credits = b.credits - p_amount
  WHERE b.user_id = p_user_id AND b.credits >= p_amount
  RETURNING b.credits INTO v_credits;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_credits;
  ELSE
    SELECT b.credits INTO v_credits FROM public.billing_accounts b WHERE b.user_id = p_user_id;
    RETURN QUERY SELECT false, COALESCE(v_credits, 0);
  END IF;
END;
$$;
