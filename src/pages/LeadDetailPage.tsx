import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { getLead, type LeadRow } from "@/services/leadsService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
  Loader2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const classificationStyles: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-600",
  "Not Interested": "bg-red-50 text-red-600",
  "Requested Callback": "bg-amber-50 text-amber-600",
  Voicemail: "bg-purple-50 text-purple-600",
  Reviewing: "bg-slate-100 text-slate-500",
};

const LeadDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getDevUser();
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [call, setCall] = useState<CallRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const l = await getLead(id);
        if (cancelled) return;
        setLead(l);
        if (l?.retell_call_id) {
          const { data } = await supabase
            .from("calls")
            .select("*")
            .eq("retell_call_id", l.retell_call_id)
            .limit(1);
          if (!cancelled) setCall(data?.[0] ?? null);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load lead.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const transcript = lead?.transcript ?? call?.transcript ?? null;
  const summary = lead?.summary ?? call?.summary ?? null;
  const recording = call?.recording_url ?? null;
  const customData = (lead?.custom_data as Record<string, string> | null) ?? {};

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
                      isActive || item.href === "/dashboard/leads"
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
          ) : !lead ? (
            <div className="py-24 text-center text-slate-500">Lead not found.</div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => navigate("/dashboard/leads")}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{lead.name ?? lead.phone}</h1>
                  {lead.lead_status && (
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                        classificationStyles[lead.lead_status] ?? "bg-slate-100 text-slate-500",
                      )}
                    >
                      {lead.lead_status}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Phone", value: lead.phone },
                  { label: "Call status", value: lead.status },
                  { label: "Attempts", value: String(lead.attempt_count ?? 0) },
                  { label: "Sentiment", value: lead.sentiment ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 capitalize truncate">{s.value}</p>
                  </div>
                ))}
              </div>

              {recording && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-cyan-500" /> Call recording
                  </h2>
                  <audio controls src={recording} className="w-full" />
                </div>
              )}

              {summary && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-2">Call summary</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">Transcript</h2>
                {transcript ? (
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{transcript}</pre>
                ) : (
                  <p className="text-sm text-slate-400">No transcript available yet.</p>
                )}
              </div>

              {Object.keys(customData).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Lead data</h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(customData).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k}</dt>
                        <dd className="text-sm text-slate-900 mt-0.5">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LeadDetailPage;
