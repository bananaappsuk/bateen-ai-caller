import { useEffect, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
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
  CreditCard,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";
import { toast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const tabs = [
  "Profile",
  "Notifications",
  "Calling Hours",
  "DNC List",
  "Integrations",
  "Billing",
] as const;
type Tab = (typeof tabs)[number];

const PROFILE_KEY = "ai_account_profile";
const NOTIFICATIONS_KEY = "ai_notifications_settings";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getDevUser();
  const initialTab = (() => {
    const q = searchParams.get("tab");
    const match = tabs.find((t) => t.toLowerCase() === (q ?? "").toLowerCase());
    return match ?? "Profile";
  })();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [profile, setProfile] = useState({ fullName: "", companyName: "" });
  const [customAmount, setCustomAmount] = useState("");
  const [notifications, setNotifications] = useState({
    email: user?.email ?? "",
    enableEmail: true,
    interestedLead: true,
    callbackRequested: true,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
      else setProfile({ fullName: user.name, companyName: "" });
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = searchParams.get("tab");
    const match = tabs.find((t) => t.toLowerCase() === (q ?? "").toLowerCase());
    if (match && match !== activeTab) setActiveTab(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (t: Tab) => {
    setActiveTab(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    toast({ title: "Profile updated", description: "Your changes have been saved." });
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
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

      {/* Main */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage your profile, preferences, and integrations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                0 Credits
              </div>
              <button
                onClick={() => changeTab("Billing")}
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Billing settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((t) => {
                const isActive = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => changeTab(t)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                      isActive
                        ? "border-cyan-500 text-cyan-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            {activeTab === "Profile" ? (
              <form onSubmit={handleUpdateProfile} className="max-w-xl space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Update your personal and company details.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    placeholder="Your company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user.email} readOnly className="bg-slate-50 text-slate-500" />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                >
                  Update Profile
                </button>
              </form>
            ) : activeTab === "Billing" ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Billing & Plans</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage your credits, top-ups, and subscription plan.
                  </p>
                </div>

                {/* Balance + Plan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                      Current Balance
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">0 Credits</p>
                    <p className="mt-1 text-xs text-slate-500">≈ 0 minutes of calling</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                      Current Plan
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">Free</p>
                    <button
                      onClick={() => navigate("/plans")}
                      className="mt-2 text-xs font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      Compare Plans →
                    </button>
                  </div>
                </div>

                {/* Top-up Credits */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Top-up Credits</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Add credits to your account. 1 credit ≈ 1 minute of calling.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { credits: 100, price: 28 },
                      { credits: 500, price: 140 },
                      { credits: 1000, price: 280 },
                      { credits: 2500, price: 700 },
                    ].map((pkg) => (
                      <button
                        key={pkg.credits}
                        className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-cyan-300 hover:shadow-sm transition-all"
                      >
                        <p className="text-lg font-bold text-slate-900">{pkg.credits} credits</p>
                        <p className="text-sm text-slate-500 mt-1">${pkg.price} USD</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="customAmount">Custom Amount (credits)</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        min={1}
                        placeholder="e.g. 350"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                    >
                      Buy Credits
                    </button>
                  </div>
                </div>

                {/* Compare Plans */}
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-cyan-50 to-pink-50 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Need more capacity?</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Compare all plans and pick the best fit for your team.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/plans")}
                    className="px-4 py-2 rounded-lg bg-white text-sm font-semibold text-slate-900 border border-slate-200 hover:border-slate-300"
                  >
                    Compare Plans
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <h2 className="text-lg font-semibold text-slate-900">{activeTab}</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  {activeTab} settings will be available soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
