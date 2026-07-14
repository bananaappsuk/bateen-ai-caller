// Tenants data-access (multi-tenant / tenant-admin). Owner-scoped by RLS.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
export type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];
export type TenantMember = Database["public"]["Tables"]["tenant_members"]["Row"];

export async function getMyTenant(): Promise<TenantRow | null> {
  const { data, error } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTenant(name: string): Promise<TenantRow> {
  const { data, error } = await supabase.from("tenants").insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTenant(id: string, patch: Partial<TenantInsert>): Promise<void> {
  const { error } = await supabase.from("tenants").update(patch).eq("id", id);
  if (error) throw error;
}

export async function listMembers(tenantId: string): Promise<TenantMember[]> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addMember(tenantId: string, email: string): Promise<void> {
  const { error } = await supabase.from("tenant_members").insert({ tenant_id: tenantId, email, role: "member" });
  if (error) throw error;
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("tenant_members").delete().eq("id", id);
  if (error) throw error;
}
