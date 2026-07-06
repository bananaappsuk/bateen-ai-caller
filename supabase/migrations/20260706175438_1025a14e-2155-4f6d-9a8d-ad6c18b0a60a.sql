
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_agent_id text UNIQUE,
  retell_agent_version integer,
  retell_llm_id text,
  name text NOT NULL,
  voice text,
  retell_voice_id text,
  prompt text,
  language text NOT NULL DEFAULT 'en-US',
  llm text,
  status text NOT NULL DEFAULT 'draft',
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO anon, authenticated;
GRANT ALL ON public.agents TO service_role;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Public can insert agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update agents" ON public.agents FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER agents_set_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
