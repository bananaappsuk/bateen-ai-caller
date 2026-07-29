-- Lock billing_accounts / credit_transactions / credit_orders down to
-- owner-scoped SELECT only. All writes to these tables now go exclusively
-- through service-role edge functions (charge-call, admin-api's
-- adjustCredits, stripe-webhook, create-topup-checkout,
-- change-subscription-plan, _shared/billing.ts's ensureCustomer /
-- ensureUserAccount) — the client no longer needs, and must no longer have,
-- direct INSERT/UPDATE/DELETE access. This replaces the "own rows" FOR ALL
-- policy from 20260714120000_auth_rls_lockdown.sql, which let a signed-in
-- user rewrite their own credits/plan_tier/stripe_customer_id/
-- stripe_subscription_id (and fabricate or delete credit_transactions /
-- credit_orders rows) directly from the browser.
--
-- service_role is untouched throughout (already has ALL, bypasses RLS) —
-- none of the legitimate write paths above are affected by this migration.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['billing_accounts', 'credit_transactions', 'credit_orders']
  LOOP
    -- Drop the old blanket policy (covered SELECT/INSERT/UPDATE/DELETE for the owner).
    EXECUTE format('DROP POLICY IF EXISTS "own rows" ON public.%I', t);

    -- The only remaining policy: owner may SELECT their own rows. No
    -- INSERT/UPDATE/DELETE policy is created for any of these tables, so
    -- those commands are denied by RLS's default-deny even if the table
    -- grant below were ever mistakenly restored.
    EXECUTE format(
      'CREATE POLICY "select own rows" ON public.%I FOR SELECT USING (user_id = auth.uid())',
      t
    );
  END LOOP;
END $$;

-- Underlying grants must match: authenticated keeps SELECT only (write
-- privileges are revoked at the table level too, not just blocked by policy,
-- since PostgREST/Postgres requires both a matching GRANT and a permissive
-- policy for an operation to succeed — belt and suspenders). anon loses all
-- access outright: billing rows are never anonymous, and auth.uid() is NULL
-- for anon sessions anyway, so anon never matched a row even before this.
REVOKE INSERT, UPDATE, DELETE ON public.billing_accounts, public.credit_transactions, public.credit_orders FROM authenticated;
REVOKE ALL ON public.billing_accounts, public.credit_transactions, public.credit_orders FROM anon;
GRANT SELECT ON public.billing_accounts, public.credit_transactions, public.credit_orders TO authenticated;
