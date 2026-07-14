-- VocalMax dialer data model: per-lead call queue + campaign dialer config.
-- Mirrors the recovered VocalMax Firestore shapes (a `leads` collection plus
-- campaign retryConfig / concurrency / criteria fields). The clone dials one
-- Retell /v2/create-phone-call per lead from a client-side scheduler loop, so it
-- needs per-lead state — NOT the batch-call model the earlier (still-unapplied)
-- campaigns migration was written for.
--
-- RLS is left wide-open here to match the existing agents/calls tables so the app
-- keeps working on dev-auth. A nullable user_id is added now to receive per-user
-- scoping + RLS lockdown in the later auth phase.

-- ---------- campaigns: adapt to the per-call scheduler model ----------
-- Base table comes from 20260709130000 (runs first in the same push). status
-- already exists (default 'draft'); VocalMax uses draft/running/paused/completed.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS concurrency integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_delay_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS interested_description text,
  ADD COLUMN IF NOT EXISTS not_interested_description text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS called_leads integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_calls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_reason text;

CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON public.campaigns (user_id);

-- ---------- leads ----------
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  campaign_id uuid REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  -- dialer state machine: pending|calling|completed|no-answer|failed|unresponsive|dnc
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  called_at timestamptz,
  next_retry_at timestamptz,
  unresponsive_at timestamptz,
  -- Retell linkage + post-call analysis
  retell_call_id text,
  -- AI classification: Interested|Not Interested|Requested Callback|Voicemail|Reviewing
  lead_status text,
  sentiment text,
  transcript text,
  summary text,
  -- dynamic variables passed to Retell (name/Name/customer_name aliases, CSV extras)
  custom_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_campaign_id_idx     ON public.leads (campaign_id);
CREATE INDEX IF NOT EXISTS leads_status_idx          ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_next_retry_at_idx   ON public.leads (next_retry_at);
CREATE INDEX IF NOT EXISTS leads_retell_call_id_idx  ON public.leads (retell_call_id);
CREATE INDEX IF NOT EXISTS leads_user_id_idx         ON public.leads (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Wide-open for now (matches existing agents/calls); locked to user_id in the auth phase.
CREATE POLICY "Public can view leads"   ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update leads" ON public.leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete leads" ON public.leads FOR DELETE USING (true);

-- Reuse the shared updated_at trigger fn defined in the calls migration.
CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();

-- Realtime so the campaign "Live System Logs" / progress UI can subscribe.
ALTER TABLE public.leads REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;
