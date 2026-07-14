-- Credits + billing, mirroring VocalMax's Firestore model: a credits balance per
-- account, a credit_transactions ledger (calls, ai_classification, top-ups,
-- subscription grants, admin adjustments) and credit_orders for Stripe top-ups.
-- Pre-auth this is single-tenant: one row with user_id = NULL. The auth phase
-- adds per-user rows + RLS lockdown.

CREATE TABLE public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  credits integer NOT NULL DEFAULT 0,
  plan_tier text,                       -- lite | starter | growth | scale | null
  subscription_status text,             -- active | trialing | past_due | canceled | null
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Enforce a single singleton row while user_id is NULL (pre-auth).
CREATE UNIQUE INDEX billing_accounts_singleton
  ON public.billing_accounts ((user_id IS NULL)) WHERE user_id IS NULL;

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,                   -- call | ai_classification | topup | subscription | adjustment
  credits numeric,                      -- signed delta
  tokens_used integer,
  cost_cents numeric,
  description text,
  stripe_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_transactions_created_idx ON public.credit_transactions (created_at DESC);

CREATE TABLE public.credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  credits integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | paid | failed
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.billing_accounts, public.credit_transactions, public.credit_orders TO anon, authenticated;
GRANT ALL ON
  public.billing_accounts, public.credit_transactions, public.credit_orders TO service_role;

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw billing_accounts" ON public.billing_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public rw credit_transactions" ON public.credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public rw credit_orders" ON public.credit_orders FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER billing_accounts_set_updated_at
BEFORE UPDATE ON public.billing_accounts
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();

-- Seed the pre-auth singleton account.
INSERT INTO public.billing_accounts (user_id, credits) VALUES (NULL, 0);
