-- Knowledge bases + inbound calling.
--
-- Knowledge bases live on Retell (POST /create-knowledge-base), which returns a
-- knowledge_base_id we attach to an agent's Retell LLM via knowledge_base_ids.
-- Retell holds them on the single shared platform account, so — exactly like
-- cloned voices — this table records which tenant owns which KB and the
-- list-knowledge-bases edge function filters on it.
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retell_kb_id      text NOT NULL UNIQUE,
  name              text NOT NULL,
  status            text NOT NULL DEFAULT 'in_progress',
  source_count      integer NOT NULL DEFAULT 0,
  auto_refresh      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_bases_user_id_idx ON public.knowledge_bases(user_id);
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_bases_select_own" ON public.knowledge_bases;
CREATE POLICY "knowledge_bases_select_own" ON public.knowledge_bases
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "knowledge_bases_update_own" ON public.knowledge_bases;
CREATE POLICY "knowledge_bases_update_own" ON public.knowledge_bases
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "knowledge_bases_delete_own" ON public.knowledge_bases;
CREATE POLICY "knowledge_bases_delete_own" ON public.knowledge_bases
  FOR DELETE USING (auth.uid() = user_id);

-- Which knowledge bases an agent uses. Mirrors what we send to Retell so the
-- edit form can show the current selection without a round trip.
CREATE TABLE IF NOT EXISTS public.agent_knowledge_bases (
  agent_id          uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, knowledge_base_id)
);
ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_kb_own" ON public.agent_knowledge_bases;
CREATE POLICY "agent_kb_own" ON public.agent_knowledge_bases
  FOR ALL USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

-- Agents are now explicitly outbound (campaign dialer) or inbound (answers a
-- number). Everything that exists today was built by the outbound dialer.
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound';
DO $$ BEGIN
  ALTER TABLE public.agents ADD CONSTRAINT agents_direction_check
    CHECK (direction IN ('inbound','outbound'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS agents_direction_idx ON public.agents(user_id, direction);

-- Inbound numbers: which tenant owns a number and which agent answers it.
-- The Retell inbound webhook resolves the dialed number through this table.
CREATE TABLE IF NOT EXISTS public.inbound_numbers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number  text NOT NULL UNIQUE,
  agent_id      uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  label         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inbound_numbers_user_id_idx ON public.inbound_numbers(user_id);
ALTER TABLE public.inbound_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inbound_numbers_select_own" ON public.inbound_numbers;
CREATE POLICY "inbound_numbers_select_own" ON public.inbound_numbers
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "inbound_numbers_update_own" ON public.inbound_numbers;
CREATE POLICY "inbound_numbers_update_own" ON public.inbound_numbers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inbound calls are looked up by direction constantly on the inbound pages.
CREATE INDEX IF NOT EXISTS calls_user_direction_idx ON public.calls(user_id, direction);
-- Inbound leads have no campaign; this keeps the Enquiries list fast.
CREATE INDEX IF NOT EXISTS leads_user_campaign_idx ON public.leads(user_id, campaign_id);
