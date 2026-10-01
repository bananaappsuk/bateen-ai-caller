import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {  useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser } from "@/lib/devAuth";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";


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
  }, []);

  if (!user) return null;


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
    <DashboardLayout>
        <div className="w-full px-6 py-8">
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
      
    </DashboardLayout>
  );
};

export default TenantAdminPage;
