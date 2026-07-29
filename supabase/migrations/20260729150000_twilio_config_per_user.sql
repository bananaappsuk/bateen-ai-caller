-- Replace per-number phone linking with a single Twilio configuration per
-- user. Previously each customer added and linked individual phone_numbers
-- rows to specific agents; now every agent, campaign, and (future) WhatsApp
-- agent shares the one Twilio account + number a user configures once in
-- Settings → Twilio. Outbound calls already pass `override_agent_id`
-- explicitly per call (see dialerEngine.ts), so no per-agent number binding
-- is needed on Retell's side — only the number itself needs to exist in
-- Retell's inventory once per user.
--
-- The old phone_numbers table is intentionally left in place (not dropped)
-- rather than risk destroying data — it's simply no longer written to by any
-- app code after this migration. It can be dropped in a future cleanup once
-- the new flow is confirmed working end-to-end.

CREATE TABLE public.twilio_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_sid text,
  auth_token text,
  api_key text,
  api_secret text,
  phone_number text NOT NULL,
  friendly_name text,
  status text NOT NULL DEFAULT 'pending', -- pending | active | invalid
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX twilio_configurations_phone_number_key ON public.twilio_configurations (phone_number);
CREATE INDEX twilio_configurations_user_id_idx ON public.twilio_configurations (user_id);

CREATE TRIGGER twilio_configurations_set_updated_at
BEFORE UPDATE ON public.twilio_configurations
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();

-- Migrate existing linked numbers where possible: one config per user,
-- preferring whichever of their numbers was actually linked to an agent. We
-- never collected a Twilio Account SID / Auth Token in the old flow (it only
-- ever imported bare phone numbers), so account_sid/auth_token cannot be
-- backfilled — only the phone number carries over, marked 'pending' so the
-- affected users are prompted to enter their real Twilio credentials once in
-- Settings → Twilio before campaigns can run again.
-- (twilio_phone_number is already UNIQUE on phone_numbers, so two different
-- user_ids can never collide on phone_number here — only user_id needs an
-- ON CONFLICT guard, for safety if this migration is ever re-run.)
INSERT INTO public.twilio_configurations (user_id, phone_number, friendly_name, status)
SELECT DISTINCT ON (p.user_id)
  p.user_id, p.twilio_phone_number, p.friendly_name, 'pending'
FROM public.phone_numbers p
ORDER BY p.user_id, (p.linked_agent_id IS NOT NULL) DESC, p.updated_at DESC
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.twilio_configurations ENABLE ROW LEVEL SECURITY;

-- Owner may SELECT their own row, but only the non-secret columns — Postgres
-- column-level GRANTs (not RLS, which is row- not column-scoped) are what
-- keep auth_token/api_secret out of reach of a direct client `.select("*")`.
-- No INSERT/UPDATE/DELETE policy exists at all: every write goes through
-- test-twilio-connection / save-twilio-config (service role), which
-- independently re-validates the credentials against Twilio's API before
-- ever touching this table.
CREATE POLICY "select own twilio config" ON public.twilio_configurations FOR SELECT USING (user_id = auth.uid());

REVOKE ALL ON public.twilio_configurations FROM anon, authenticated;
GRANT SELECT (id, user_id, phone_number, friendly_name, status, created_at, updated_at)
  ON public.twilio_configurations TO authenticated;
GRANT ALL ON public.twilio_configurations TO service_role;
