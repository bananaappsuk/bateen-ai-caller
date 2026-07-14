// Admin API client (super-admin operations via the admin-api edge function,
// which runs with the service role after verifying the caller is an admin).
import { supabase } from "@/integrations/supabase/client";

async function call<T>(action: string, payload?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("admin-api", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
  return data as T;
}

export interface AdminOverview {
  totalUsers: number;
  campaigns: number;
  leads: number;
  calls: number;
  agents: number;
  subscriptionsByTier: Record<string, number>;
  totalCredits: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  banned: boolean;
  created_at: string;
}

export const adminOverview = () => call<AdminOverview>("overview");
export const adminTrends = () => call<{ callsByDay: Record<string, number> }>("trends");
export const adminListUsers = () => call<{ users: AdminUser[] }>("listUsers");
export const adminDisableUser = (id: string) => call<{ ok: boolean }>("disableUser", { id });
export const adminEnableUser = (id: string) => call<{ ok: boolean }>("enableUser", { id });
export const adminDeleteUser = (id: string) => call<{ ok: boolean }>("deleteUser", { id });
export const adminImpersonate = (id: string) => call<{ link: string }>("impersonate", { id });
export const adminSyncNumbers = () => call<{ synced: number }>("syncNumbers");
export const adminBuyNumber = (areaCode?: string) => call<{ number: string }>("buyNumber", { areaCode });
export const adminRemoveNumber = (phone: string) => call<{ ok: boolean }>("removeNumber", { phone });
export const adminEndTrial = (id?: string) => call<{ ok: boolean }>("endTrial", { id });
export const adminSeedDemo = () => call<{ ok: boolean; campaignId: string }>("seedDemo");
