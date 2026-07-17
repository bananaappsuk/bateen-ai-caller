// Hot-lead email notification settings (Supabase-backed, per user). Configured
// from Settings > Notifications; read server-side by the retell-webhook /
// classify-lead edge functions to pick the alert recipient.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const { data, error } = await supabase.from("notification_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveNotificationSettings(patch: {
  enable_email: boolean;
  recipient_email: string;
  interested_lead: boolean;
  callback_requested: boolean;
}): Promise<void> {
  const existing = await getNotificationSettings();
  if (existing) {
    const { error } = await supabase
      .from("notification_settings")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("notification_settings").insert(patch);
  if (error) throw error;
}
