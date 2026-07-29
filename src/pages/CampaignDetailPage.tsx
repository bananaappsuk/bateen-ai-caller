import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  getCampaign,
  updateCampaign,
  canStartCampaign,
  type CampaignRow,
  type CampaignStatus,
} from "@/services/campaignsService";
import { listLeads, type LeadRow, type LeadStatus } from "@/services/leadsService";
import { getAgent, type AgentRow } from "@/services/agentsService";
import { PLATFORM_TWILIO_NUMBER } from "@/lib/platformConfig";
import { useDialer } from "@/services/dialerEngine";
import type { CallingHours } from "@/lib/callingHours";
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
  ArrowLeft,
  Play,
  Pause,
  Loader2,
  Terminal,
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

const leadStatusStyles: Record<LeadStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  calling: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  "no-answer": "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-600",
  unresponsive: "bg-orange-50 text-orange-600",
  dnc: "bg-rose-100 text-rose-700",
};

const classificationStyles: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-600",
  "Not Interested": "bg-red-50 text-red-600",
  "Requested Callback": "bg-amber-50 text-amber-600",
  Voicemail: "bg-purple-50 text-purple-600",
  Reviewing: "bg-slate-100 text-slate-500",
};

const logColor: Record<string, string> = {
  info: "text-slate-300",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-slate-500",
};

function loadCallingHours(): CallingHours | null {
  try {
    const raw = localStorage.getItem("ai_calling_hours");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadDnc(): Set<string> {
  try {
    const raw = localStorage.getItem("ai_dnc_list");
    const list = raw ? JSON.parse(raw) : [];
    return new Set((list as { number: string }[]).map((e) => e.number));
  } catch {
    return new Set();
  }
}

const CampaignDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getDevUser();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const callingHours = useMemo(() => loadCallingHours(), []);
  const dnc = useMemo(() => loadDnc(), []);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const c = await getCampaign(id);
      setCampaign(c);
      if (c?.agent_id) setAgent(await getAgent(c.agent_id));
      setLeads(await listLeads(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The dialer runs while this page is open; it only dials when status==="running".
  const { logs } = useDialer(id, { callingHours, dnc, onChange: reload });

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const status = (campaign?.status as CampaignStatus) ?? "draft";

  const counts = leads.reduce(
    (acc, l) => {
      acc[l.status as LeadStatus] = (acc[l.status as LeadStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<LeadStatus, number>,
  );

  const setStatus = async (next: CampaignStatus) => {
    if (!id || !campaign) return;
    try {
      if (next === "running") {
        // Fail fast with a clear reason rather than silently queuing and
        // letting the dialer discover the same problem on its next tick.
        const check = await canStartCampaign(campaign);
        if (!check.ok) {
          toast.error(check.reason ?? "This campaign can't be started right now.");
          return;
        }
      }
      await updateCampaign(id, next === "running" ? { status: next, paused_reason: null } : { status: next });
      setCampaign((prev) => (prev ? { ...prev, status: next } : prev));
      toast.success(next === "running" ? "Campaign started — dialing…" : "Campaign paused.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign.");
    }
  };

  const canStart = status === "draft" || status === "paused";
  const called = campaign?.called_leads ?? 0;
  const total = campaign?.total_leads ?? leads.length;
  const progress = total > 0 ? Math.min(100, Math.round((called / total) * 100)) : 0;

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
                      isActive || item.href === "/dashboard/campaigns"
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
          {loading ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !campaign ? (
            <div className="py-24 text-center text-slate-500">Campaign not found.</div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/dashboard/campaigns")}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-slate-100 text-slate-600">
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {agent ? `${agent.name} · ${PLATFORM_TWILIO_NUMBER}` : "No agent assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canStart ? (
                    <button
                      onClick={() => setStatus("running")}
                      disabled={!agent?.retell_agent_id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" /> {status === "paused" ? "Resume" : "Start"} Campaign
                    </button>
                  ) : status === "running" ? (
                    <button
                      onClick={() => setStatus("paused")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      <Pause className="h-4 w-4" /> Pause
                    </button>
                  ) : null}
                </div>
              </div>

              {!agent?.retell_agent_id && (
                <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
                  This campaign's agent needs to be synced with Retell before it can dial.
                </div>
              )}

              {status === "paused" && campaign.paused_reason === "out_of_credits" && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 flex items-center justify-between gap-4">
                  <span>
                    Paused — you're out of calling credits. Any calls already in progress will finish normally;
                    add credits to resume dialing new leads.
                  </span>
                  <button
                    onClick={() => navigate("/dashboard/settings?tab=Billing")}
                    className="shrink-0 rounded-lg bg-red-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-red-700"
                  >
                    Add credits
                  </button>
                </div>
              )}
              {status === "paused" && campaign.paused_reason === "no_agent" && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
                  Paused — this campaign's agent isn't synced with Retell. Re-sync or reassign the agent to resume.
                </div>
              )}

              {/* Progress */}
              <div className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">
                    {called} / {total} calls placed
                  </p>
                  <p className="text-sm text-slate-500">{progress}%</p>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
                  {(
                    ["pending", "calling", "completed", "no-answer", "failed", "unresponsive", "dnc"] as LeadStatus[]
                  ).map((s) => (
                    <div key={s} className="rounded-lg bg-slate-50 py-2">
                      <p className="text-lg font-bold text-slate-900">{counts[s] ?? 0}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Leads ({leads.length})</h2>
                  </div>
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
                        <tr>
                          <th className="text-left px-5 py-2.5 font-medium">Name</th>
                          <th className="text-left px-5 py-2.5 font-medium">Phone</th>
                          <th className="text-left px-5 py-2.5 font-medium">Status</th>
                          <th className="text-left px-5 py-2.5 font-medium">Classification</th>
                          <th className="text-left px-5 py-2.5 font-medium">Tries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                              No leads uploaded.
                            </td>
                          </tr>
                        ) : (
                          leads.map((l) => (
                            <tr
                              key={l.id}
                              className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                              onClick={() => navigate(`/dashboard/leads/${l.id}`)}
                            >
                              <td className="px-5 py-2.5 font-medium text-slate-900">{l.name ?? "—"}</td>
                              <td className="px-5 py-2.5 text-slate-600">{l.phone}</td>
                              <td className="px-5 py-2.5">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-semibold",
                                    leadStatusStyles[l.status as LeadStatus] ?? "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-5 py-2.5">
                                {l.lead_status ? (
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                                      classificationStyles[l.lead_status] ?? "bg-slate-100 text-slate-500",
                                    )}
                                  >
                                    {l.lead_status}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-2.5 text-slate-600">{l.attempt_count ?? 0}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live System Logs */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-soft overflow-hidden flex flex-col max-h-[560px]">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-slate-100">Live System Logs</h2>
                    {status === "running" && (
                      <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
                    {logs.length === 0 ? (
                      <p className="text-slate-500">Waiting for activity…</p>
                    ) : (
                      logs.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-slate-600 shrink-0">{l.time}</span>
                          <span className={logColor[l.type] ?? "text-slate-300"}>{l.msg}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CampaignDetailPage;
