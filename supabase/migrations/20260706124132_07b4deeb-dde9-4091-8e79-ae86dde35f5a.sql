
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retell_call_id TEXT UNIQUE,
  agent_id TEXT,
  agent_name TEXT,
  from_number TEXT,
  to_number TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  call_type TEXT NOT NULL DEFAULT 'phone_call',
  status TEXT NOT NULL DEFAULT 'registered',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO anon, authenticated;
GRANT ALL ON public.calls TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view calls"   ON public.calls FOR SELECT USING (true);
CREATE POLICY "Public can insert calls" ON public.calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update calls" ON public.calls FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.calls_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calls_set_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
