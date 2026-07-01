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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trash2,
  ShieldOff,
  Info,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";
import { toast } from "@/hooks/use-toast";
import { IntegrationCard, integrations } from "@/components/IntegrationCard";

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
const DNC_KEY = "ai_dnc_list";

type DncEntry = { number: string; addedAt: string };

const CALLING_HOURS_KEY = "ai_calling_hours";
const DEFAULT_TIMEZONE = "Europe/London";

type DaySchedule = { enabled: boolean; start: string; end: string };

day: string): DaySchedule => ({ enabled: day !== "Saturday" && day !== "Sunday", start: "09:00", end: "18:00" });

const defaultCallingHours: Record<string, DaySchedule> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].reduce((acc, day) => {
  acc[day] = buildDefaultDaySchedule(day);
  return acc;
}, {} as Record<string, DaySchedule>);

const timezones = [
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (France)" },
  { value: "America/New_York", label: "New York (US)" },
  { value: "America/Los_Angeles", label: "Los Angeles (US)" },
  { value: "Asia/Dubai", label: "Dubai (UAE)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney (Australia)" },
];

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
  const [dncList, setDncList] = useState<DncEntry[]>([]);
  const [dncInput, setDncInput] = useState("");
  const [dncError, setDncError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
      else setProfile({ fullName: user.name, companyName: "" });

      const rawNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
      if (rawNotifications) {
        const parsed = JSON.parse(rawNotifications);
        setNotifications((prev) => ({
          ...prev,
          ...parsed,
          email: parsed.email || user.email,
        }));
      }
      const rawDnc = localStorage.getItem(DNC_KEY);
      if (rawDnc) setDncList(JSON.parse(rawDnc));
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

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    toast({ title: "Notifications saved", description: "Your email alert preferences have been updated." });
  };

  const persistDnc = (list: DncEntry[]) => {
    setDncList(list);
    localStorage.setItem(DNC_KEY, JSON.stringify(list));
  };

  const handleAddDnc = () => {
    const trimmed = dncInput.replace(/\s+/g, "");
    if (!trimmed) {
      setDncError("Please enter a phone number.");
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
      setDncError("Enter a valid number in international format (E.164), e.g. +447700900123.");
      return;
    }
    if (dncList.some((e) => e.number === trimmed)) {
      setDncError("This number is already in the block list.");
      return;
    }
    persistDnc([{ number: trimmed, addedAt: new Date().toISOString() }, ...dncList]);
    setDncInput("");
    setDncError(null);
    toast({ title: "Number blocked", description: `${trimmed} added to the DNC list.` });
  };

  const handleRemoveDnc = (num: string) => {
    persistDnc(dncList.filter((e) => e.number !== num));
    setPendingRemove(null);
    toast({ title: "Number removed", description: `${num} removed from the DNC list.` });
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
            ) : activeTab === "Notifications" ? (
              <form onSubmit={handleSaveNotifications} className="max-w-3xl space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Choose how and when you want to be alerted.
                  </p>
                </div>

                {/* Maintenance Banner */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Under Maintenance</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      We're currently investigating an issue with email notifications. This feature will be available again shortly.
                    </p>
                  </div>
                </div>

                {/* Email Alerts Card */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Email Alerts</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Receive alerts when leads turn hot or warm.
                    </p>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label htmlFor="enableEmail" className="text-sm font-medium text-slate-900">
                        Enable Email Notifications
                      </Label>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Receive alerts when leads turn hot or warm.
                      </p>
                    </div>
                    <Switch
                      id="enableEmail"
                      checked={notifications.enableEmail}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, enableEmail: checked }))
                      }
                      className="data-[state=checked]:bg-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail" className="text-sm font-medium text-slate-900">
                      Recipient Email
                    </Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={notifications.email}
                      onChange={(e) =>
                        setNotifications((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="you@company.com"
                      disabled={!notifications.enableEmail}
                      className={!notifications.enableEmail ? "bg-slate-50 text-slate-500" : ""}
                    />
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-900">Triggers</p>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Label htmlFor="interestedLead" className="text-sm font-medium text-slate-900">
                          Interested Lead Detected
                        </Label>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Notify when a lead is marked as interested.
                        </p>
                      </div>
                      <Switch
                        id="interestedLead"
                        checked={notifications.interestedLead}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, interestedLead: checked }))
                        }
                        disabled={!notifications.enableEmail}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Label htmlFor="callbackRequested" className="text-sm font-medium text-slate-900">
                          Callback Requested
                        </Label>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Notify when a prospect asks for a callback.
                        </p>
                      </div>
                      <Switch
                        id="callbackRequested"
                        checked={notifications.callbackRequested}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, callbackRequested: checked }))
                        }
                        disabled={!notifications.enableEmail}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </form>
            ) : activeTab === "DNC List" ? (
              <div className="max-w-3xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Do Not Call List</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-xl">
                      Numbers in this list will be blocked from being called, even if they appear in a campaign CSV.
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                    <ShieldOff className="h-3.5 w-3.5" />
                    {dncList.length} blocked
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <Label htmlFor="dncInput" className="text-sm font-medium text-slate-900">
                    Add phone number
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="dncInput"
                      value={dncInput}
                      onChange={(e) => {
                        setDncInput(e.target.value);
                        if (dncError) setDncError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDnc();
                        }
                      }}
                      placeholder="e.g. +447700900123"
                      className="h-11 flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddDnc}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                    >
                      Add
                    </button>
                  </div>
                  {dncError && (
                    <p className="text-sm text-red-600">{dncError}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Use international (E.164) format starting with a country code, e.g. +44 for the UK.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Blocked numbers</h3>
                    <span className="text-xs text-slate-500">{dncList.length} total</span>
                  </div>
                  {dncList.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <ShieldOff className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">No numbers blocked yet.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {dncList.map((entry) => (
                        <li
                          key={entry.number}
                          className="flex items-center justify-between gap-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 font-mono">
                              {entry.number}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Added{" "}
                              {new Date(entry.addedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingRemove(entry.number)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <AlertDialog
                  open={pendingRemove !== null}
                  onOpenChange={(open) => !open && setPendingRemove(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove blocked number?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {pendingRemove} will be removed from your Do Not Call list and can be dialed by future campaigns.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => pendingRemove && handleRemoveDnc(pendingRemove)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : activeTab === "Integrations" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Connect your favourite tools to automate follow-ups and scheduling.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {integrations.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
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
