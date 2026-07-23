import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { listLeads, type LeadRow, type LeadClassification } from "@/services/leadsService";
import { listCampaigns } from "@/services/campaignsService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Download,
  Star,
  PhoneOff,
  PhoneCall,
  Voicemail,
  Loader2,
  UserRound,
  RefreshCw,
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

const CLASSIFICATIONS: LeadClassification[] = [
  "Interested",
  "Not Interested",
  "Requested Callback",
  "Voicemail",
  "Reviewing",
];

const styles: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-600",
  "Not Interested": "bg-red-50 text-red-600",
  "Requested Callback": "bg-amber-50 text-amber-600",
  Voicemail: "bg-purple-50 text-purple-600",
  Reviewing: "bg-slate-100 text-slate-500",
};

const LeadsPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [campaignNames, setCampaignNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | LeadClassification>("All");

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const load = async () => {
    try {
      const [l, campaigns] = await Promise.all([listLeads(), listCampaigns()]);
      setLeads(l);
      setCampaignNames(new Map(campaigns.map((c) => [c.campaign_id, c.name])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Total: leads.length };
    for (const k of CLASSIFICATIONS) c[k] = 0;
    for (const l of leads) if (l.lead_status && c[l.lead_status] != null) c[l.lead_status]++;
    return c;
  }, [leads]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const filtered = activeTab === "All" ? leads : leads.filter((l) => l.lead_status === activeTab);

  const summaryCards = [
    { label: "Total Leads", value: counts.Total, icon: Users, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "Interested", value: counts.Interested, icon: Star, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Callbacks", value: counts["Requested Callback"], icon: PhoneCall, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Not Interested", value: counts["Not Interested"], icon: PhoneOff, color: "text-red-600", bg: "bg-red-50" },
    { label: "Voicemail", value: counts.Voicemail, icon: Voicemail, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Reviewing", value: counts.Reviewing, icon: Loader2, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  const handleExport = () => {
    const rows = [
      ["Name", "Phone", "Campaign", "Status", "Classification", "Updated"],
      ...filtered.map((l) => [
        l.name ?? "",
        l.phone,
        campaignNames.get(l.campaign_id ?? "") ?? "",
        l.status,
        l.lead_status ?? "",
        l.updated_at ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
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
                      isActive
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Scored Leads</h1>
              <p className="text-sm text-slate-500 mt-1">Leads classified by your AI from every call.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setLoading(true);
                  load();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {summaryCards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", c.bg)}>
                  <c.icon className={cn("h-4 w-4", c.color)} />
                </div>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{c.value ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(["All", ...CLASSIFICATIONS] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  activeTab === t
                    ? "bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white border-transparent shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-50 to-purple-50 flex items-center justify-center mb-4">
                  <UserRound className="h-6 w-6 text-cyan-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">No leads in this category.</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Once your AI agents start calling, classified leads appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-left px-5 py-3 font-medium">Phone</th>
                      <th className="text-left px-5 py-3 font-medium">Campaign</th>
                      <th className="text-left px-5 py-3 font-medium">Call Status</th>
                      <th className="text-left px-5 py-3 font-medium">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                        onClick={() => navigate(`/dashboard/leads/${l.id}`)}
                      >
                        <td className="px-5 py-3 font-medium text-slate-900">{l.name ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{l.phone}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {campaignNames.get(l.campaign_id ?? "") ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-600 capitalize">{l.status}</td>
                        <td className="px-5 py-3">
                          {l.lead_status ? (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                styles[l.lead_status] ?? "bg-slate-100 text-slate-500",
                              )}
                            >
                              {l.lead_status}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeadsPage;
