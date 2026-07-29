-- Redesign phone_numbers into a strictly tenant-owned model.
--
-- Problem: the app previously fetched Retell's *entire* phone-number list
-- (retellService.listPhoneNumbers(), a direct call to a shared, un-scoped
-- Retell account) and rendered it to whichever user happened to be logged
-- in, including which OTHER tenant's agent each number was bound to
-- (agentsService.getPhoneNumberLinkStatus() / phone_number_link_status()).
-- That is a straightforward cross-tenant data leak: numbers and agent
-- associations belonging to one customer were visible to every other
-- customer. This migration, together with the new add/link/unlink/remove/
-- sync-phone-number edge functions, makes phone_numbers a per-user-owned
-- table instead: each row belongs to exactly one user_id, RLS restricts
-- reads to the owner, and Retell's global inventory is never queried from
-- the browser again for this flow.
--
-- The phone_numbers table already existed (20260709120000...) but was never
-- actually written to by the app (agents.phone_number, a plain denormalized
-- text column, was — and remains — what the dialer reads). This migration
-- reshapes the table to the new ownership model and backfills it from the
-- existing agents.phone_number links so no current mapping is lost.

-- ---------- 1. Reshape phone_numbers ----------

ALTER TABLE public.phone_numbers RENAME COLUMN phone_number TO twilio_phone_number;
ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS assigned_agent_id;
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS linked_agent_id uuid;
ALTER TABLE public.phone_numbers ALTER COLUMN provider SET DEFAULT 'twilio';
ALTER TABLE public.phone_numbers ALTER COLUMN status SET DEFAULT 'pending';

-- Backfill from the current source of truth (agents.phone_number), before
-- twilio_phone_number gets its UNIQUE constraint further down — so this
-- can't rely on ON CONFLICT (that constraint doesn't exist yet) and instead
-- de-dupes explicitly: one row per user_id, then one row per phone_number
-- (the old shared-number model could leave the same number on more than one
-- user's agent, e.g. via the admin-only demo-call feature), and skips
-- anything already present in phone_numbers.
WITH per_user AS (
  SELECT DISTINCT ON (a.user_id) a.user_id, a.phone_number, a.id AS agent_id
  FROM public.agents a
  WHERE a.phone_number IS NOT NULL AND a.user_id IS NOT NULL
  ORDER BY a.user_id, a.updated_at DESC
),
per_number AS (
  SELECT DISTINCT ON (phone_number) user_id, phone_number, agent_id
  FROM per_user
  ORDER BY phone_number, user_id
)
INSERT INTO public.phone_numbers (user_id, retell_phone_number_id, twilio_phone_number, linked_agent_id, provider, status)
SELECT user_id, phone_number, phone_number, agent_id, 'twilio', 'active'
FROM per_number pn
WHERE NOT EXISTS (SELECT 1 FROM public.phone_numbers p WHERE p.twilio_phone_number = pn.phone_number);

-- If the same number was (under the old shared-pool model) linked to more
-- than one tenant's agent, only the backfill above "wins" that number. Clear
-- agents.phone_number for every other agent that no longer has a matching
-- phone_numbers row pointing back at it, so the denormalized field can't
-- disagree with the new ownership table. Affected tenants will see "no
-- number connected" and need to re-add their own — flagged in the rollout
-- notes, since it can't be resolved automatically without knowing which
-- tenant should really keep a contested number.
--
-- agents_prevent_phone_change_during_campaign (20260716120000) rightly
-- blocks this for ordinary app traffic (an active campaign shouldn't have
-- its number pulled out from under it) but must not block this one
-- deliberate, reviewed migration statement — disabled only for its duration.
ALTER TABLE public.agents DISABLE TRIGGER agents_prevent_phone_change_during_campaign;
UPDATE public.agents a
SET phone_number = NULL
WHERE a.phone_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.phone_numbers p
    WHERE p.twilio_phone_number = a.phone_number AND p.linked_agent_id = a.id
  );
ALTER TABLE public.agents ENABLE TRIGGER agents_prevent_phone_change_during_campaign;

-- Now that every remaining row has a real owner, enforce it.
DELETE FROM public.phone_numbers WHERE user_id IS NULL;
ALTER TABLE public.phone_numbers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.phone_numbers ALTER COLUMN twilio_phone_number SET NOT NULL;

ALTER TABLE public.phone_numbers
  ADD CONSTRAINT phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.phone_numbers
  ADD CONSTRAINT phone_numbers_linked_agent_id_fkey FOREIGN KEY (linked_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.phone_numbers
  ADD CONSTRAINT phone_numbers_twilio_phone_number_key UNIQUE (twilio_phone_number);

CREATE INDEX IF NOT EXISTS phone_numbers_user_id_idx ON public.phone_numbers (user_id);
CREATE INDEX IF NOT EXISTS phone_numbers_linked_agent_id_idx ON public.phone_numbers (linked_agent_id);

-- Already exists from the table's original creation (20260709120000...) —
-- this migration doesn't need to (re)create it, just confirm it's there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'phone_numbers_set_updated_at' AND tgrelid = 'public.phone_numbers'::regclass
  ) THEN
    CREATE TRIGGER phone_numbers_set_updated_at
    BEFORE UPDATE ON public.phone_numbers
    FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
  END IF;
END $$;

-- ---------- 2. RLS: owner may only SELECT; every write goes through the
-- add/link/unlink/remove/sync-phone-number edge functions (service role),
-- which independently verify ownership of both the number and, where
-- relevant, the agent before touching anything — mirrors the billing_accounts
-- read-only lockdown (20260729120000_billing_tables_readonly_rls.sql) for
-- the same reason: a table whose rows determine what a tenant can dial out
-- from must never be writable directly by that tenant's own browser session.
DROP POLICY IF EXISTS "Public can view phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Public can insert phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Public can update phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "own rows" ON public.phone_numbers;

CREATE POLICY "select own phone_numbers" ON public.phone_numbers FOR SELECT USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.phone_numbers FROM authenticated;
REVOKE ALL ON public.phone_numbers FROM anon;
GRANT SELECT ON public.phone_numbers TO authenticated;

-- ---------- 3. One number -> at most one agent, enforced at the DB level
-- too (defense in depth alongside phone_numbers.linked_agent_id, which by
-- construction can only ever name one agent per row). Numbers are no longer
-- a cross-tenant shared pool, so re-restore the constraint that
-- 20260728140000_demo_config_and_multi_agent_numbers.sql dropped for the
-- admin-only demo-call feature — that feature manipulates Retell's own
-- binding directly and never writes agents.phone_number, so it is unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS agents_phone_number_unique
  ON public.agents (phone_number) WHERE phone_number IS NOT NULL;

-- ---------- 4. Retire the cross-tenant "who else holds this number" RPC —
-- it exists to support the shared-number picker this migration removes, and
-- was itself a cross-tenant read (SECURITY DEFINER, granted to
-- `authenticated`, returning another tenant's agent name/id for any number).
DROP FUNCTION IF EXISTS public.phone_number_link_status(text[]);
