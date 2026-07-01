// DEV ONLY — hardcoded user accounts for local/staging access.
// Do NOT use this for production. Replace with real auth before launch.

export type DevRole = "admin" | "user";

export interface DevUser {
  email: string;
  password: string;
  role: DevRole;
  name: string;
  initials: string;
  allowedRoutes: string[]; // route prefixes the user may access
}

export const DEV_USERS: DevUser[] = [
  {
    email: "admin@aitelecaller.com",
    password: "Admin@123",
    role: "admin",
    name: "Admin",
    initials: "AD",
    allowedRoutes: [
      "/dashboard",
      "/ai-agents",
      "/dashboard/agents",
      "/campaigns",
      "/dashboard/campaigns",
      "/leads",
      "/dashboard/leads",
      "/settings",
      "/dashboard/settings",
      "/academy",
      "/dashboard/academy",
      "/support",
      "/dashboard/support",
    ],
  },
  {
    email: "user@business.com",
    password: "User@123",
    role: "user",
    name: "Business User",
    initials: "BU",
    allowedRoutes: ["/dashboard", "/campaigns", "/leads"],
  },
];

const STORAGE_KEY = "dev_auth_user";

export const devSignIn = (email: string, password: string): DevUser | null => {
  const match = DEV_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!match) return null;
  const { password: _pw, ...safe } = match;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  return match;
};

export const devSignOut = () => localStorage.removeItem(STORAGE_KEY);

export const getDevUser = (): Omit<DevUser, "password"> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const canAccessRoute = (
  user: Pick<DevUser, "allowedRoutes"> | null,
  href: string
): boolean => {
  if (!user) return false;
  return user.allowedRoutes.some((r) => href === r || href.startsWith(r + "/"));
};
