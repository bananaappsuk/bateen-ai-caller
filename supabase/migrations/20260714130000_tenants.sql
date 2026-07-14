-- Multi-tenant layer (VocalMax tenants + tenant-admin). Additive — does not change
-- the per-user data model. A tenant is owned by a user; the owner manages members,
-- enabled calling countries, white-label, and a shared credit pool.

CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL,
  enabled_countries text[] NOT NULL DEFAULT ARRAY['+44', '+1'],
  white_label boolean NOT NULL DEFAULT false,
  credit_pool integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_members_tenant_idx ON public.tenant_members (tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants, public.tenant_members TO anon, authenticated;
GRANT ALL ON public.tenants, public.tenant_members TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tenant" ON public.tenants FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "own tenant members" ON public.tenant_members FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE TRIGGER tenants_set_owner BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
