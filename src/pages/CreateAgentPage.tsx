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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  ArrowLeft,
  PhoneOff,
  PhoneForwarded,
  CalendarCheck,
  Voicemail,
  Gauge,
  Waves,
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

const STORAGE_KEY = "linked_ai_agents_list";

const PRESETS = [
  { id: "sales", label: "Sales Outreach", desc: "Qualify leads and book meetings" },
  { id: "support", label: "Customer Support", desc: "Answer questions and resolve issues" },
  { id: "survey", label: "Survey / Feedback", desc: "Collect responses from customers" },
  { id: "reminder", label: "Appointment Reminder", desc: "Confirm and reschedule bookings" },
];

const VOICES = [
  { id: "mia", label: "Mia — Warm female (EN-US)" },
  { id: "salma", label: "Salma — Professional female (EN-GB)" },
  { id: "sarah", label: "Sarah — Friendly female (EN-AU)" },
  { id: "james", label: "James — Confident male (EN-US)" },
];

const AMBIENCES = [
  { id: "none", label: "None (silent)" },
  { id: "office", label: "Office background" },
  { id: "cafe", label: "Cafe" },
  { id: "callcenter", label: "Call center" },
];

const defaultForm = {
  preset: "sales",
  voice: "mia",
  internalName: "",
  prompt: "",
  ambience: "none",
  responseSpeed: 5,
  hangUpOnVoicemail: true,
  endCallAutomatically: true,
  bookCalSlot: false,
  transferToHuman: false,
};

const CreateAgentPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleCancel = () => navigate("/ai-agents");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.internalName.trim() || !form.prompt.trim()) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const next = [
        ...existing,
        {
          id: crypto.randomUUID(),
          kind: "created",
          ...form,
          internalName: form.internalName.trim(),
          prompt: form.prompt.trim(),
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    navigate("/ai-agents");
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
                      isActive || (item.href === "/ai-agents")
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

      {/* Main — fixed viewport with sticky header + footer */}
      <main className="flex-1 ml-[260px] h-screen flex flex-col">
        {/* Sticky page header */}
        <div className="shrink-0 bg-white border-b border-slate-100 px-6 sm:px-10 py-5">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Back to Voice Agents"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Create New Agent</h1>
              <p className="text-sm text-slate-500">
                Configure your AI voice agent's personality, voice, and behaviour.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable form area */}
        <form
          id="create-agent-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8 space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, preset: p.id })}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      form.preset === p.id
                        ? "border-cyan-400 bg-cyan-50/50 ring-2 ring-cyan-100"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            <div className="space-y-2">
              <Label htmlFor="voice">Voice</Label>
              <Select
                value={form.voice}
                onValueChange={(v) => setForm({ ...form, voice: v })}
              >
                <SelectTrigger id="voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                value={form.internalName}
                onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                placeholder="e.g., Sales Outreach Bot"
                required
              />
            </div>

            {/* Script / Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Script / Prompt</Label>
              <Textarea
                id="prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder="You are a friendly sales representative for..."
                rows={6}
                required
              />
              <p className="text-xs text-slate-500">
                Describe the agent's role, tone, and objectives.
              </p>
            </div>

            {/* Background Ambience */}
            <div className="space-y-2">
              <Label htmlFor="ambience" className="flex items-center gap-1.5">
                <Waves className="h-3.5 w-3.5" /> Background Ambience
              </Label>
              <Select
                value={form.ambience}
                onValueChange={(v) => setForm({ ...form, ambience: v })}
              >
                <SelectTrigger id="ambience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMBIENCES.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Response Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Response Speed
                </Label>
                <span className="text-xs font-medium text-slate-700">
                  {form.responseSpeed}/10
                </span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[form.responseSpeed]}
                onValueChange={(v) => setForm({ ...form, responseSpeed: v[0] })}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Thoughtful</span>
                <span>Snappy</span>
              </div>
            </div>

            {/* Hang up on voicemail */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <Voicemail className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Hang Up on Voicemail</p>
                  <p className="text-xs text-slate-500">
                    Automatically end the call if voicemail is detected.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.hangUpOnVoicemail}
                onCheckedChange={(c) => setForm({ ...form, hangUpOnVoicemail: c })}
              />
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <PhoneOff className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">End Call Automatically</p>
                      <p className="text-xs text-slate-500">
                        Let the agent hang up when the conversation is complete.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.endCallAutomatically}
                    onCheckedChange={(c) => setForm({ ...form, endCallAutomatically: c })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Book a Cal.com Slot</p>
                      <p className="text-xs text-slate-500">
                        Allow the agent to book meetings via Cal.com.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.bookCalSlot}
                    onCheckedChange={(c) => setForm({ ...form, bookCalSlot: c })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <PhoneForwarded className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Transfer to a Human</p>
                      <p className="text-xs text-slate-500">
                        Warm-transfer the call to a human agent when needed.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.transferToHuman}
                    onCheckedChange={(c) => setForm({ ...form, transferToHuman: c })}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky footer action bar */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-6 sm:px-10 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-agent-form"
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
            >
              Create Agent
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateAgentPage;
