import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCredits } from "@/services/creditsService";
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
  Phone,
  TrendingUp,
  Clock,
  Activity,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/dashboard/agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Stats {
  totalCalls: number;
  interested: number;
  avgDurationMin: number;
  credits: number;
}

interface TopLead {
  id: string;
  name: string | null;
  phone: string;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [bannerOpen, setBannerOpen] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem("dashboard_onboarding_dismissed"),
  );
  const [stats, setStats] = useState<Stats>({ totalCalls: 0, interested: 0, avgDurationMin: 0, credits: 0 });
  const [volume, setVolume] = useState<{ day: string; calls: number }[]>(
    DAYS.map((d) => ({ day: d, calls: 0 })),
  );
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [callsCount, interestedCount, credits, recentCalls, interestedLeads, durations] =
          await Promise.all([
            supabase.from("calls").select("id", { count: "exact", head: true }),
            supabase.from("leads").select("id", { count: "exact", head: true }).eq("lead_status", "Interested"),
            getCredits(),
            supabase.from("calls").select("created_at").gte("created_at", since),
            supabase.from("leads").select("id,name,phone").eq("lead_status", "Interested").limit(5),
            supabase.from("calls").select("duration_ms").not("duration_ms", "is", null).limit(500),
          ]);

        const durList = (durations.data ?? []).map((d) => d.duration_ms as number).filter(Boolean);
        const avgMin = durList.length
          ? durList.reduce((a, b) => a + b, 0) / durList.length / 60000
          : 0;

        setStats({
          totalCalls: callsCount.count ?? 0,
          interested: interestedCount.count ?? 0,
          avgDurationMin: Math.round(avgMin * 10) / 10,
          credits,
        });

        // 7-day call volume buckets.
        const buckets = DAYS.map((d) => ({ day: d, calls: 0 }));
        for (const c of recentCalls.data ?? []) {
          const dayIdx = new Date(c.created_at as string).getDay();
          buckets[dayIdx].calls++;
        }
        setVolume(buckets);
        setTopLeads((interestedLeads.data ?? []) as TopLead[]);
        setHasData((callsCount.count ?? 0) > 0);
      } catch {
        // keep zeros
      }
    })();
  }, []);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };
  const dismissBanner = () => {
    setBannerOpen(false);
    localStorage.setItem("dashboard_onboarding_dismissed", "1");
  };

  const statCards = [
    { title: "Total Calls", value: stats.totalCalls.toLocaleString(), icon: Phone, iconColor: "text-cyan-500", iconBg: "bg-cyan-50" },
    { title: "Interested Leads", value: stats.interested.toLocaleString(), icon: TrendingUp, iconColor: "text-purple-500", iconBg: "bg-purple-50" },
    { title: "Avg. Duration", value: `${stats.avgDurationMin}m`, icon: Clock, iconColor: "text-pink-500", iconBg: "bg-pink-50" },
    { title: "Credits", value: stats.credits.toLocaleString(), icon: CreditCard, iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
  ];

  const onboardingSteps = [
    { title: "Create your first AI agent", description: "Pick a voice and write your call script.", button: "Create agent", route: "/dashboard/agents/create" },
    { title: "Upload your leads", description: "Import a CSV of the people you want to call.", button: "Upload leads", route: "/dashboard/campaigns/create" },
    { title: "Start your first campaign", description: "Point your agent at your leads and go live.", button: "Start campaign", route: "/dashboard/campaigns" },
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
                <p className="text-xs text-slate-500 truncate capitalize">{user.role} · {user.email}</p>
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
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
              <p className="text-sm text-slate-500 mt-1">Welcome back. Here is your AI fleet performance.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                {stats.credits.toLocaleString()} Credits
              </div>
              <button
                onClick={() => navigate("/dashboard/settings?tab=Billing")}
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Billing settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {bannerOpen && !hasData && (
            <div className="relative mb-8 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] p-6 text-white shadow-soft overflow-hidden">
              <button onClick={dismissBanner} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
              <div className="mb-6 pr-8">
                <h2 className="text-lg font-semibold">Get started with AI Tele Caller</h2>
                <p className="text-sm text-white/90 mt-1">Four steps to your first campaign</p>
              </div>
              <div className="grid gap-4">
                {onboardingSteps.map((step, i) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="text-xs text-white/80 mt-0.5">{step.description}</p>
                    </div>
                    <button onClick={() => navigate(step.route)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-900 hover:bg-white/90">
                      {step.button} &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => (
              <Card key={stat.title} className="bg-white rounded-xl border-slate-100 shadow-soft">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stat.iconBg)}>
                      <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white rounded-xl border-slate-100 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">Call Volume (7 days)</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-[280px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0" }} />
                      <Line type="monotone" dataKey="calls" stroke="#00D4FF" strokeWidth={2} dot={{ r: 3, fill: "#00D4FF", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {!hasData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-sm font-medium text-slate-400">No data yet</p>
                      <p className="text-xs text-slate-400 mt-1">Launch a campaign to see calls</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border-slate-100 shadow-soft">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Top Leads</CardTitle>
                <a href="/dashboard/leads" className="text-xs font-medium text-cyan-500 hover:text-cyan-600">View All</a>
              </CardHeader>
              <CardContent className="p-5">
                {topLeads.length === 0 ? (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                      <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No data yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Interested leads appear here as campaigns run.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topLeads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => navigate(`/dashboard/leads/${l.id}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left"
                      >
                        <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{l.name ?? l.phone}</p>
                          <p className="text-xs text-slate-500 truncate">{l.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
