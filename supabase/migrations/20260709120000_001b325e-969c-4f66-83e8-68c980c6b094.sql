
-- Retell has no separate phone-number "id" resource — the E.164 number itself
-- is the identifier. retell_phone_number_id mirrors phone_number so the table
-- shape matches other Retell-backed tables (agents, calls) that key off a
-- retell_*_id column.
CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_phone_number_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  friendly_name text,
  provider text,
  assigned_agent_id text,
  status text NOT NULL DEFAULT 'unassigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_numbers TO anon, authenticated;
GRANT ALL ON public.phone_numbers TO service_role;

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view phone_numbers" ON public.phone_numbers FOR SELECT USING (true);
CREATE POLICY "Public can insert phone_numbers" ON public.phone_numbers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update phone_numbers" ON public.phone_numbers FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER phone_numbers_set_updated_at
BEFORE UPDATE ON public.phone_numbers
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
