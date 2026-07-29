-- Live Demo simplification: instead of every user configuring their own
-- Twilio Account SID/Auth Token, the demo uses a single pre-configured
-- Twilio number on the admin account (admin@aitelecaller.com), already
-- imported into Retell and already in active use by the "AI Tele Caller -
-- Live Demo" agent (see demo_call_config, set up 2026-07-28). Reusing that
-- same real, working number here rather than a new one.
--
-- account_sid/auth_token are intentionally left NULL: Retell already has
-- this number in its inventory (no re-import needed), and outbound calls go
-- through Retell's create-phone-call using the phone number alone — the
-- Twilio credential columns only matter for a future real per-user
-- self-service flow (test-twilio-connection / save-twilio-config), which
-- this leaves fully intact for later.
INSERT INTO public.twilio_configurations (user_id, phone_number, friendly_name, status)
SELECT u.id, '+447576545787', 'Live Demo', 'active'
FROM auth.users u
WHERE u.email = 'admin@aitelecaller.com'
ON CONFLICT (user_id) DO UPDATE
SET phone_number = EXCLUDED.phone_number,
    friendly_name = EXCLUDED.friendly_name,
    status = 'active';
