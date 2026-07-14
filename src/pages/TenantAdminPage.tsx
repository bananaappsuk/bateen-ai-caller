import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  getMyTenant,
  createTenant,
  updateTenant,
  listMembers,
  addMember,
  removeMember,
  type TenantRow,
  type TenantMember,
} from "@/services/tenantsService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  Bot,
  PhoneOutgoing,
  Users,
  Settings as SettingsIcon,
  GraduationCap,
  LifeBuoy,
  Lock,
  LogOut,
  ChevronsUpDown,
  Building2,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const COUNTRIES = [
  { code: "+44", label: "UK" },
  { code: "+1", label: "US / Canada" },
  { code: "+91", label: "India" },
  { code: "+61", label: "Australia" },
  { code: "+971", label: "UAE" },
  { code: "+65", label: "Singapore" },
  { code: "+49", label: "Germany" },
];

const TenantAdminPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const load = async () => {
    try {
      const t = await getMyTenant();
      setTenant(t);
      if (t) setMembers(await listMembers(t.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tenant.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const t = await createTenant(newName.trim());
      setTenant(t);
      toast.success("Tenant created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tenant.");
    }
  };

  const patch = (p: Partial<TenantRow>) => setTenant((t) => (t ? { ...t, ...p } : t));

  const toggleCountry = (code: string) => {
    if (!tenant) return;
    const set = new Set(tenant.enabled_countries ?? []);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    patch({ enabled_countries: Array.from(set) });
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await updateTenant(tenant.id, {
        name: tenant.name,
        enabled_countries: tenant.enabled_countries,
        white_label: tenant.white_label,
        credit_pool: tenant.credit_pool,
      });
      toast.success("Tenant settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!tenant || !memberEmail.trim()) return;
    try {
      await addMember(tenant.id, memberEmail.trim());
      setMemberEmail("");
      setMembers(await listMembers(tenant.id));
      toast.success("Member added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member.");
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await removeMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <img src={logo} alt="AI Tele Caller" className="h-8 w-auto" />
          <span className="font-semibold text-slate-900 tracking-tight">AI Tele Caller</span>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive ? "bg-cyan-50 text-cyan-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )
                  }
                  end={item.href === "/dashboard"}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tenant Admin</h1>
              <p className="text-sm text-slate-500">Manage your workspace, countries, members and credit pool.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !tenant ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 max-w-md">
              <h2 className="text-base font-semibold text-slate-900 mb-2">Create your tenant</h2>
              <p className="text-sm text-slate-500 mb-4">Set up a workspace to manage members and settings.</p>
              <div className="flex gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company / workspace name" />
                <Button onClick={handleCreate} className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95">
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Settings */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tname">Workspace name</Label>
                  <Input id="tname" value={tenant.name} onChange={(e) => patch({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Enabled calling countries</Label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => {
                      const on = (tenant.enabled_countries ?? []).includes(c.code);
                      return (
                        <button
                          key={c.code}
                          onClick={() => toggleCountry(c.code)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                            on
                              ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {c.label} ({c.code})
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">White-label</p>
                      <p className="text-xs text-slate-500">Hide AI Tele Caller branding.</p>
                    </div>
                    <Switch checked={tenant.white_label} onCheckedChange={(c) => patch({ white_label: c })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pool">Credit pool</Label>
                    <Input
                      id="pool"
                      type="number"
                      value={tenant.credit_pool}
                      onChange={(e) => patch({ credit_pool: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
                >
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </div>

              {/* Members */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Members ({members.length})</h2>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="member@company.com"
                    type="email"
                  />
                  <Button onClick={handleAddMember} variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-slate-400">No members yet.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{m.email}</p>
                          <p className="text-xs text-slate-500 capitalize">{m.role}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-red-500 hover:text-red-600 p-1.5"
                          aria-label="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TenantAdminPage;
