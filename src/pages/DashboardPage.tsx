import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
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
  ChevronDown,
  PhoneCall,
  ClipboardList,
  AlertTriangle,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: true },
  { icon: Bot, label: "AI Agents", href: "/dashboard/agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const statCards = [
  {
    title: "Total Calls",
    value: "0",
    icon: Phone,
    iconColor: "text-cyan-500",
    iconBg: "bg-cyan-50",
  },
  {
    title: "Interested Leads",
    value: "0",
    icon: TrendingUp,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
  },
  {
    title: "Avg. Duration",
    value: "0m",
    icon: Clock,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-50",
  },
  {
    title: "Agent Uptime",
    value: "99.9%",
    icon: Activity,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
  },
];

const callVolumeData = [
  { day: "Mon", calls: 0 },
  { day: "Tue", calls: 0 },
  { day: "Wed", calls: 0 },
  { day: "Thu", calls: 0 },
  { day: "Fri", calls: 0 },
  { day: "Sat", calls: 0 },
  { day: "Sun", calls: 0 },
];

const onboardingSteps = [
  {
    title: "Create your first AI agent",
    description: "Pick a voice and write your call script.",
    button: "Create agent",
    active: true,
  },
  {
    title: "Attach a phone number",
    description: "Give your agent a number so it can place calls.",
    button: "Attach number",
    active: false,
  },
  {
    title: "Upload your leads",
    description: "Import a CSV of the people you want to call.",
    button: "Upload leads",
    active: false,
  },
  {
    title: "Start your first campaign",
    description: "Point your agent at your leads and go live.",
    button: "Start campaign",
    active: false,
  },
];

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState("7d");
  const [bannerOpen, setBannerOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("dashboard_onboarding_dismissed");
  });
  const navigate = useNavigate();
  const user = getDevUser();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const dismissBanner = () => {
    setBannerOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard_onboarding_dismissed", "1");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-slate-200 flex flex-col z-20">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <img src={logo} alt="AI Tele Caller" className="h-8 w-auto" />
          <span className="font-semibold text-slate-900 tracking-tight">
            AI Tele Caller
          </span>
        </div>

        {/* Nav */}
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
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )
                  }
                  end={item.href === "/dashboard"}
                >
                  <item.icon className={cn("h-4 w-4", item.active ? "text-cyan-500" : "")} />
                  <span className="flex-1">{item.label}</span>
                  {item.locked && (
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user.role} · {user.email}
                </p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
              <p className="text-sm text-slate-500 mt-1">
                Welcome back. Here is your AI fleet performance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                0 Credits
              </div>
              <button
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:text-red-600 hover:border-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Onboarding banner */}
          {bannerOpen && (
            <div className="relative mb-8 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] p-6 text-white shadow-soft overflow-hidden">
              <button
                onClick={dismissBanner}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Dismiss onboarding"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-6 pr-8">
                <h2 className="text-lg font-semibold">Get started with AI Tele Caller</h2>
                <p className="text-sm text-white/90 mt-1">0 of 4 steps complete</p>
              </div>
              <div className="grid gap-4">
                {onboardingSteps.map((step, i) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="text-xs text-white/80 mt-0.5">{step.description}</p>
                    </div>
                    <button
                      disabled={!step.active}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        step.active
                          ? "bg-white text-slate-900 hover:bg-white/90"
                          : "bg-white/20 text-white/70 cursor-not-allowed"
                      )}
                    >
                      {step.button} &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
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

          {/* Two-column row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Call Volume chart */}
            <Card className="lg:col-span-2 bg-white rounded-xl border-slate-100 shadow-soft">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Call Volume
                </CardTitle>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200 rounded-lg">
                    <SelectValue placeholder="Last 7 Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-[280px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={callVolumeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        stroke="url(#callGradient)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#00D4FF", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 5 }}
                      />
                      <defs>
                        <linearGradient id="callGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#00D4FF" />
                          <stop offset="100%" stopColor="#FF6FD8" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-sm font-medium text-slate-400">No data yet</p>
                    <p className="text-xs text-slate-400 mt-1">Launch a campaign to see calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Leads panel */}
            <Card className="bg-white rounded-xl border-slate-100 shadow-soft">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Top Leads</CardTitle>
                <a
                  href="/dashboard/leads"
                  className="text-xs font-medium text-cyan-500 hover:text-cyan-600 transition-colors"
                >
                  View All
                </a>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-[280px] flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No data yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Interested leads will appear here once your campaigns start generating conversations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Usage — user role only */}
          {user.role === "user" && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">My Usage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: "AI Calls Made", icon: PhoneCall, color: "text-cyan-500", bg: "bg-cyan-50" },
                  { title: "Orders/Feedback Logged", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-50" },
                  { title: "Complaints Raised", icon: AlertTriangle, color: "text-pink-500", bg: "bg-pink-50" },
                ].map((c) => (
                  <Card key={c.title} className="bg-white rounded-xl border-slate-100 shadow-soft">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">{c.title}</p>
                          <p className="text-2xl font-bold text-slate-900">0</p>
                          <p className="text-xs text-slate-400 mt-1">No data yet</p>
                        </div>
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", c.bg)}>
                          <c.icon className={cn("h-5 w-5", c.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
