-- Shared-Twilio-number model: this app uses a small pool of Retell/Twilio
-- numbers shared across every tenant (no per-customer dedicated numbers).
-- Enforces "one number can be linked to at most one agent at a time" and
-- "can't unlink/reassign a number while its agent has an active campaign"
-- at the database level, so the rule holds regardless of which client path
-- touches the row. Also makes campaign deletion fully erase its call history
-- (recordings/transcripts), not just orphan it.

-- ---------- 1. Campaign deletion also removes its calls ----------
-- Previously ON DELETE SET NULL (calls survived, orphaned). Leads already
-- cascade; calls should too so deleting a campaign is a full erase.
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_campaign_id_fkey;
ALTER TABLE public.calls
  ADD CONSTRAINT calls_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE;

-- ---------- 2. One phone number -> at most one agent, system-wide ----------
-- Numbers are a shared resource across all tenants, so this is a plain
-- (non-per-user) partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS agents_phone_number_unique
  ON public.agents (phone_number) WHERE phone_number IS NOT NULL;

-- ---------- 3. Can't change a linked number while its agent has an active campaign ----------
CREATE OR REPLACE FUNCTION public.prevent_phone_change_during_campaign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.phone_number IS NOT NULL AND NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    IF EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE agent_id = OLD.id AND status IN ('running', 'paused')
    ) THEN
      RAISE EXCEPTION 'Cannot unlink or change this agent''s phone number while it has an active campaign. Stop, finish, or delete the campaign first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agents_prevent_phone_change_during_campaign ON public.agents;
CREATE TRIGGER agents_prevent_phone_change_during_campaign
BEFORE UPDATE OF phone_number ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.prevent_phone_change_during_campaign();

-- ---------- 4. Cross-tenant read of "who currently holds this number" ----------
-- RLS normally scopes `agents` to its owner, but the shared-number picker
-- needs to know (name only, no other agent data) which agent already holds
-- a given number and whether it's mid-campaign, regardless of who owns it.
CREATE OR REPLACE FUNCTION public.phone_number_link_status(numbers text[])
RETURNS TABLE(phone_number text, agent_id uuid, agent_name text, has_active_campaign boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.phone_number, a.id, a.name,
         EXISTS (
           SELECT 1 FROM public.campaigns c
           WHERE c.agent_id = a.id AND c.status IN ('running', 'paused')
         )
  FROM public.agents a
  WHERE a.phone_number = ANY(numbers);
$$;

GRANT EXECUTE ON FUNCTION public.phone_number_link_status(text[]) TO authenticated;
