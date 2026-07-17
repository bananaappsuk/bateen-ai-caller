-- Per-user hot-lead email notification settings, configurable from the app's
-- Settings > Notifications tab instead of a server-side env secret. Falls back
-- to the HOT_LEAD_EMAIL edge function secret when a user has no row yet.

CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  enable_email boolean NOT NULL DEFAULT true,
  recipient_email text,
  interested_lead boolean NOT NULL DEFAULT true,
  callback_requested boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO anon, authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON public.notification_settings FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER notification_settings_set_user_id BEFORE INSERT ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER notification_settings_set_updated_at BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.calls_set_updated_at();
