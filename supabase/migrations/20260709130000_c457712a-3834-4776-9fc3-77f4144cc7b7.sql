
CREATE TABLE public.campaigns (
  campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  retell_batch_call_id text UNIQUE,
  total_leads integer NOT NULL DEFAULT 0,
  notes text,
  timezone text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Public can insert campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update campaigns" ON public.campaigns FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER campaigns_set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
