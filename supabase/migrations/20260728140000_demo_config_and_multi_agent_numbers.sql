-- 1. Admin-editable config for the public landing-page "live demo call" button.
-- Singleton row (id is always `true`) so admin-api can upsert it without a
-- lookup. demo-call reads this first, falling back to the DEMO_AGENT_ID /
-- DEMO_FROM_NUMBER secrets if the row is empty.
CREATE TABLE IF NOT EXISTS public.demo_call_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  agent_id text,
  agent_name text,
  phone_number text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
INSERT INTO public.demo_call_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.demo_call_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies: only the service role (demo-call, admin-api) touches this table.

-- 2. Retell lets several weighted agents share one phone number (used e.g. to
-- add a demo agent onto a number a production agent already uses). Drop the
-- earlier one-agent-per-number constraint to match; the active-campaign
-- change-protection trigger from 20260716120000 is unaffected and still applies.
DROP INDEX IF EXISTS public.agents_phone_number_unique;
