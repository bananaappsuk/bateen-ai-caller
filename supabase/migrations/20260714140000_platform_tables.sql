-- Platform-operator tables from VocalMax: signup_leads (landing live-demo capture),
-- consent_log (GDPR per-call consent), audit_log (admin action trail).

-- Landing-page live-demo / signup capture (anon inserts allowed).
CREATE TABLE public.signup_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'live_demo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.signup_leads TO anon, authenticated;
GRANT ALL ON public.signup_leads TO service_role;
ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can insert signup_leads" ON public.signup_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
-- reads are service-role only (admin-api).

-- Per-call consent record (owner-scoped).
CREATE TABLE public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lead_id uuid,
  campaign_id uuid,
  phone text,
  consent_basis text NOT NULL DEFAULT 'legitimate_interest',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_log_campaign_idx ON public.consent_log (campaign_id);
GRANT SELECT, INSERT ON public.consent_log TO anon, authenticated;
GRANT ALL ON public.consent_log TO service_role;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consent_log" ON public.consent_log FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER consent_log_set_user_id BEFORE INSERT ON public.consent_log
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- Admin action audit trail (service-role writes; owner reads own actions).
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO anon, authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit_log" ON public.audit_log FOR ALL
  USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());
