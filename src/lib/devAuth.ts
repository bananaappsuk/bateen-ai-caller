// Auth compatibility layer — real Supabase Auth behind the original getDevUser()
// synchronous API the pages already use. The AuthProvider (src/lib/auth.tsx)
// keeps `currentUser` in sync with the Supabase session; ProtectedRoute
// guarantees a user exists before a protected page renders, so getDevUser()
// is non-null inside the dashboard.
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type DevRole = "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: DevRole;
}

let currentUser: AppUser | null = null;

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const two = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (two || name.slice(0, 2)).toUpperCase();
}

export function mapUser(u: User | null): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.name as string) || (u.email?.split("@")[0] ?? "User");
  const role = ((meta.role as DevRole) ?? "user") as DevRole;
  return { id: u.id, email: u.email ?? "", name, initials: initialsFrom(name), role };
}

export function setCurrentUser(u: AppUser | null): void {
  currentUser = u;
}

// Synchronous accessor used throughout the dashboard pages.
export function getDevUser(): AppUser | null {
  return currentUser;
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const u = mapUser(data.user);
  setCurrentUser(u);
  return u;
}

export async function signUp(email: string, password: string, name: string): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  const u = mapUser(data.user);
  setCurrentUser(u);
  return u;
}

export async function devSignOut(): Promise<void> {
  await supabase.auth.signOut();
  setCurrentUser(null);
}

// Canonical app origin for links that leave the app (e.g. password-reset
// emails). Pinned via env so a reset triggered from localhost/staging still
// points at production; falls back to the current origin when unset.
const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// All authenticated users see the full nav; admin-only pages gate on role
// separately. (Kept for signature compatibility with the dashboard pages.)
export function canAccessRoute(_user: AppUser | null, _href: string): boolean {
  return true;
}
