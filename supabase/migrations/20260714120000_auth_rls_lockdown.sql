-- Per-user RLS lockdown (replaces the dev-phase wide-open policies now that real
-- Supabase Auth is in place). Adds user_id where missing, auto-sets it to
-- auth.uid() on insert, and scopes every policy to the owning user. Edge
-- functions use the service-role key and bypass RLS.

-- user_id on the tables that lacked it.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS agents_user_id_idx ON public.agents (user_id);
CREATE INDEX IF NOT EXISTS calls_user_id_idx ON public.calls (user_id);

-- Auto-stamp the owner on insert.
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Helper applied per table below.
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agents', 'campaigns', 'leads', 'calls', 'phone_numbers',
    'billing_accounts', 'credit_transactions', 'credit_orders'
  ]
  LOOP
    -- Drop every existing policy on the table.
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Owner-only access.
    EXECUTE format(
      'CREATE POLICY "own rows" ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t
    );

    -- Auto-stamp trigger.
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_user_id', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_user_id()',
      t || '_set_user_id', t
    );
  END LOOP;
END $$;

-- billing_accounts is now per-user: drop the pre-auth singleton row + its
-- partial unique index.
DROP INDEX IF EXISTS public.billing_accounts_singleton;
DELETE FROM public.billing_accounts WHERE user_id IS NULL;

-- webhook_events: only the service role reads/writes it (no per-user column).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.webhook_events', pol.policyname);
  END LOOP;
END $$;
