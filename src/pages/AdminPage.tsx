import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  getBillingAccount,
  listTransactions,
  type BillingAccount,
  type CreditTransaction,
} from "@/services/creditsService";
import {
  adminOverview,
  adminListUsers,
  adminDisableUser,
  adminEnableUser,
  adminDeleteUser,
  adminImpersonate,
  adminSyncNumbers,
  adminBuyNumber,
  adminRemoveNumber,
  adminEndTrial,
  adminAdjustCredits,
  adminSeedDemo,
  adminGetDemoConfig,
  adminSetDemoConfig,
  type AdminOverview,
  type AdminUser,
  type DemoCallConfig,
} from "@/services/adminService";
import { listAgents, type AgentRow } from "@/services/agentsService";
import { retellService, type RetellPhoneNumber } from "@/services/retellService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ShieldCheck,
  CreditCard,
  Phone,
  Megaphone,
  Ban,
  CheckCircle2,
  Trash2,
  LogIn,
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

const AdminPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [numbers, setNumbers] = useState<RetellPhoneNumber[]>([]);
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [txns, setTxns] = useState<CreditTransaction[]>([]);
  const [adjust, setAdjust] = useState("");
  const [reason, setReason] = useState("");
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [demoConfig, setDemoConfig] = useState<DemoCallConfig | null>(null);
  const [demoAgentId, setDemoAgentId] = useState("");
  const [demoPhoneNumber, setDemoPhoneNumber] = useState("");
  const [savingDemo, setSavingDemo] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      const { users: u } = await adminListUsers();
      setUsers(u);
    } catch {
      /* not admin / no access */
    }
  };

  const load = async () => {
    try {
      const [ov, acct, transactions] = await Promise.all([
        adminOverview().catch(() => null),
        getBillingAccount(),
        listTransactions(25),
      ]);
      setOverview(ov);
      setAccount(acct);
      setTxns(transactions);
      await loadUsers();
      retellService.listPhoneNumbers().then(setNumbers).catch(() => setNumbers([]));
      listAgents().then(setAgents).catch(() => setAgents([]));
      adminGetDemoConfig()
        .then(({ config }) => {
          setDemoConfig(config);
          setDemoAgentId(config?.agent_id ?? "");
          setDemoPhoneNumber(config?.phone_number ?? "");
        })
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load admin data.");
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

  const handleAdjust = async () => {
    const delta = Number(adjust);
    if (!delta || !account) return;
    try {
      await adminAdjustCredits(delta, reason.trim() || undefined);
      setAdjust("");
      setReason("");
      toast.success("Credits adjusted.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust credits.");
    }
  };

  const disable = async (u: AdminUser) => {
    try {
      await adminDisableUser(u.id);
      toast.success(`Disabled ${u.email}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const enable = async (u: AdminUser) => {
    try {
      await adminEnableUser(u.id);
      toast.success(`Enabled ${u.email}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const remove = async (u: AdminUser) => {
    if (!confirm(`Permanently delete ${u.email} and all their data?`)) return;
    try {
      const { deleted } = await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      const counts = Object.entries(deleted ?? {})
        .filter(([, n]) => n > 0)
        .map(([table, n]) => `${table}: ${n}`)
        .join(", ");
      toast.success(counts ? `User deleted. Removed — ${counts}.` : "User deleted (no related records found).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const impersonate = async (u: AdminUser) => {
    try {
      const { link } = await adminImpersonate(u.id);
      if (link) {
        window.open(link, "_blank");
        toast.success(`Impersonation link opened for ${u.email}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const syncNumbers = async () => {
    try {
      const { synced } = await adminSyncNumbers();
      toast.success(`Synced ${synced} number(s) from Retell.`);
      retellService.listPhoneNumbers().then(setNumbers).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const buyNumber = async () => {
    const areaCode = prompt("Area code to buy (e.g. 415), or leave blank for any:") ?? undefined;
    try {
      const { number } = await adminBuyNumber(areaCode || undefined);
      toast.success(`Purchased ${number}`);
      retellService.listPhoneNumbers().then(setNumbers).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const removeNumber = async (phone: string) => {
    if (!confirm(`Release ${phone}? This deletes it from Retell.`)) return;
    try {
      await adminRemoveNumber(phone);
      setNumbers((prev) => prev.filter((n) => n.phone_number !== phone));
      toast.success("Number released.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const seedDemo = async () => {
    try {
      await adminSeedDemo();
      toast.success("Demo data seeded (agent + campaign + leads).");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };
  const saveDemoConfig = async () => {
    if (!demoAgentId || !demoPhoneNumber) {
      toast.error("Pick both an agent and a phone number.");
      return;
    }
    setSavingDemo(true);
    try {
      const agentName = agents.find((a) => a.retell_agent_id === demoAgentId)?.name ?? null;
      const { config } = await adminSetDemoConfig(demoAgentId, agentName, demoPhoneNumber);
      setDemoConfig(config);
      toast.success("Demo call settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save demo call settings.");
    } finally {
      setSavingDemo(false);
    }
  };

  const endTrial = async () => {
    try {
      await adminEndTrial();
      toast.success("Trial ended.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };

  const statCards = [
    { label: "Users", value: overview?.totalUsers ?? users.length, icon: Users },
    { label: "Campaigns", value: overview?.campaigns ?? 0, icon: Megaphone },
    { label: "Calls", value: overview?.calls ?? 0, icon: Phone },
    { label: "Agents", value: overview?.agents ?? 0, icon: Bot },
  ];

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
        <div className="w-full px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
                <p className="text-sm text-slate-500">Platform stats, users, numbers and credits.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Sync numbers", fn: syncNumbers },
                { label: "Buy number", fn: buyNumber },
                { label: "Seed demo", fn: seedDemo },
                { label: "End my trial", fn: endTrial },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.fn}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {statCards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{c.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{c.value.toLocaleString()}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                    <c.icon className="h-5 w-5 text-cyan-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {overview && (
            <div className="mb-6 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
                Total credits in system: {overview.totalCredits.toLocaleString()}
              </span>
              {Object.entries(overview.subscriptionsByTier).map(([tier, n]) => (
                <span key={tier} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 capitalize">
                  {tier}: {n}
                </span>
              ))}
            </div>
          )}

          {/* Users */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Users ({users.length})</h2>
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">Email</th>
                    <th className="text-left px-5 py-2.5 font-medium">Name</th>
                    <th className="text-left px-5 py-2.5 font-medium">Role</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                    <th className="text-right px-5 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        No users (admin access required to list).
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-5 py-2.5 font-medium text-slate-900">{u.email}</td>
                        <td className="px-5 py-2.5 text-slate-600">{u.name ?? "—"}</td>
                        <td className="px-5 py-2.5 capitalize text-slate-600">{u.role}</td>
                        <td className="px-5 py-2.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold",
                              u.banned ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
                            )}
                          >
                            {u.banned ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => impersonate(u)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Impersonate (magic link)">
                              <LogIn className="h-4 w-4" />
                            </button>
                            {u.banned ? (
                              <button onClick={() => enable(u)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Enable">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => disable(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Disable">
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => remove(u)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Credit management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-500" /> Your Credits
              </h2>
              <p className="text-3xl font-black text-slate-900">
                {(account?.credits ?? 0).toLocaleString()}
                <span className="text-base font-semibold text-slate-400"> credits</span>
              </p>
              <div className="mt-4 space-y-2">
                <Input type="number" placeholder="Amount (negative to deduct)" value={adjust} onChange={(e) => setAdjust(e.target.value)} />
                <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button onClick={handleAdjust} className="w-full bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95">
                  Apply adjustment
                </Button>
              </div>
            </div>

            {/* Phone number inventory (pool) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Phone Numbers ({numbers.length})</h2>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium">Number</th>
                      <th className="text-left px-5 py-2.5 font-medium">Nickname</th>
                      <th className="text-left px-5 py-2.5 font-medium">Bound agent</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {numbers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400">No numbers on Retell.</td>
                      </tr>
                    ) : (
                      numbers.map((n) => (
                        <tr key={n.phone_number} className="border-t border-slate-100">
                          <td className="px-5 py-2.5 font-medium text-slate-900">{n.phone_number_pretty ?? n.phone_number}</td>
                          <td className="px-5 py-2.5 text-slate-600">{n.nickname || "—"}</td>
                          <td className="px-5 py-2.5 text-slate-600 font-mono text-xs">
                            {n.outbound_agents?.[0]?.agent_id ?? n.inbound_agents?.[0]?.agent_id ?? "unassigned"}
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <button
                              onClick={() => removeNumber(n.phone_number)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Release number"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Demo call settings */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Demo Call Settings</h2>
            <p className="text-xs text-slate-500 mb-4">
              Agent and number the public landing-page "Get a live demo call" button uses. Falls back to the
              DEMO_AGENT_ID / DEMO_FROM_NUMBER secrets if nothing is set here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Agent</label>
                <Select value={demoAgentId} onValueChange={setDemoAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      .filter((a) => a.retell_agent_id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.retell_agent_id as string}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Phone number</label>
                <Select value={demoPhoneNumber} onValueChange={setDemoPhoneNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a number" />
                  </SelectTrigger>
                  <SelectContent>
                    {numbers.map((n) => (
                      <SelectItem key={n.phone_number} value={n.phone_number}>
                        {n.phone_number_pretty ?? n.phone_number}
                        {n.nickname ? ` — ${n.nickname}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={saveDemoConfig}
                disabled={savingDemo}
                className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
              >
                {savingDemo ? "Saving…" : "Save demo settings"}
              </Button>
              {demoConfig?.agent_id && (
                <p className="text-xs text-slate-500">
                  Currently live: <span className="font-medium text-slate-700">{demoConfig.agent_name ?? demoConfig.agent_id}</span> on{" "}
                  <span className="font-mono">{demoConfig.phone_number}</span>
                </p>
              )}
            </div>
          </div>

          {/* Ledger */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Credit Transactions</h2>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">Type</th>
                    <th className="text-left px-5 py-2.5 font-medium">Credits</th>
                    <th className="text-left px-5 py-2.5 font-medium">Description</th>
                    <th className="text-left px-5 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">No transactions yet.</td>
                    </tr>
                  ) : (
                    txns.map((t) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-5 py-2.5 capitalize text-slate-700">{t.type}</td>
                        <td className={cn("px-5 py-2.5 font-mono font-semibold", (t.credits ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {(t.credits ?? 0) >= 0 ? "+" : ""}
                          {t.credits ?? 0}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600">{t.description ?? "—"}</td>
                        <td className="px-5 py-2.5 text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
