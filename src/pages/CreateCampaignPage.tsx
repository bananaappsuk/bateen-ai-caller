import { useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
  Download,
  FileSpreadsheet,
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

const CAMPAIGNS_KEY = "ai_campaigns_list";
const AGENTS_KEY = "linked_ai_agents_list";

const COUNTRIES = [
  { code: "US", label: "United States (+1)" },
  { code: "GB", label: "United Kingdom (+44)" },
  { code: "IN", label: "India (+91)" },
  { code: "AU", label: "Australia (+61)" },
  { code: "CA", label: "Canada (+1)" },
  { code: "AE", label: "United Arab Emirates (+971)" },
  { code: "SG", label: "Singapore (+65)" },
  { code: "DE", label: "Germany (+49)" },
];

const TEMPLATE_CSV =
  "name,phone,email,company\nJane Doe,+14155550101,jane@example.com,Acme Inc\nJohn Smith,+14155550102,john@example.com,Globex\n";

const defaultForm = {
  name: "",
  agent: "",
  maxRetries: 3,
  retryDelay: 30,
  qualificationCriteria: "",
  interestedDescription: "",
  notInterestedDescription: "",
  country: "US",
  csvFileName: "",
  csvLeadCount: 0,
};

const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const availableAgents = useMemo<{ id: string; label: string }[]>(() => {
    try {
      const raw = localStorage.getItem(AGENTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list)
        ? list.map((a: any) => ({
            id: a.id,
            label: a.internalName || a.agentId || "Unnamed agent",
          }))
        : [];
    } catch {
      return [];
    }
  }, []);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleCancel = () => navigate("/dashboard/campaigns");

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = Math.max(0, lines.length - 1); // exclude header
    setForm((prev) => ({ ...prev, csvFileName: file.name, csvLeadCount: rows }));
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaign-leads-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const raw = localStorage.getItem(CAMPAIGNS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const next = [
        ...existing,
        {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          agent: form.agent,
          status: "Draft",
          leads: form.csvLeadCount,
          calls: 0,
          description: form.qualificationCriteria,
          maxRetries: form.maxRetries,
          retryDelay: form.retryDelay,
          interestedDescription: form.interestedDescription,
          notInterestedDescription: form.notInterestedDescription,
          country: form.country,
          csvFileName: form.csvFileName,
        },
      ];
      localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    navigate("/dashboard/campaigns");
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
                      isActive || item.href === "/dashboard/campaigns"
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
              aria-label="Back to Campaigns"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">New Campaign</h1>
              <p className="text-sm text-slate-500">
                Set up a campaign, assign an agent, and upload your lead list.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable form area */}
        <form
          id="create-campaign-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8 space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Summer outreach"
                required
              />
            </div>

            {/* Select Agent */}
            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              {availableAgents.length > 0 ? (
                <Select
                  value={form.agent}
                  onValueChange={(v) => setForm({ ...form, agent: v })}
                >
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map((a) => (
                      <SelectItem key={a.id} value={a.label}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input
                    id="agent"
                    value={form.agent}
                    onChange={(e) => setForm({ ...form, agent: e.target.value })}
                    placeholder="e.g. Sarah"
                  />
                  <p className="text-xs text-slate-500">
                    No agents found. Create one from the AI Agents page, or enter a name manually.
                  </p>
                </>
              )}
            </div>

            {/* Retries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min={0}
                  max={10}
                  value={form.maxRetries}
                  onChange={(e) =>
                    setForm({ ...form, maxRetries: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-slate-500">
                  Number of times to retry a lead if the call fails.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryDelay">Retry Delay (minutes)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min={0}
                  value={form.retryDelay}
                  onChange={(e) =>
                    setForm({ ...form, retryDelay: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-slate-500">
                  Wait time between retry attempts.
                </p>
              </div>
            </div>

            {/* AI Lead Qualification Criteria */}
            <div className="space-y-2">
              <Label htmlFor="qualification">AI Lead Qualification Criteria</Label>
              <Textarea
                id="qualification"
                value={form.qualificationCriteria}
                onChange={(e) =>
                  setForm({ ...form, qualificationCriteria: e.target.value })
                }
                placeholder="Describe how the AI should evaluate and score each lead."
                rows={4}
              />
            </div>

            {/* Interested */}
            <div className="space-y-2">
              <Label htmlFor="interested">Interested Lead Description</Label>
              <Textarea
                id="interested"
                value={form.interestedDescription}
                onChange={(e) =>
                  setForm({ ...form, interestedDescription: e.target.value })
                }
                placeholder="What signals mark a lead as interested?"
                rows={3}
              />
            </div>

            {/* Not Interested */}
            <div className="space-y-2">
              <Label htmlFor="notInterested">Not Interested Lead Description</Label>
              <Textarea
                id="notInterested"
                value={form.notInterestedDescription}
                onChange={(e) =>
                  setForm({ ...form, notInterestedDescription: e.target.value })
                }
                placeholder="What signals mark a lead as not interested?"
                rows={3}
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Phone Number Country</Label>
              <Select
                value={form.country}
                onValueChange={(v) => setForm({ ...form, country: v })}
              >
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Default country used to parse phone numbers in your CSV.
              </p>
            </div>

            {/* CSV Upload */}
            <div className="space-y-2">
              <Label>Upload CSV</Label>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {form.csvFileName || "No file selected"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.csvFileName
                          ? `${form.csvLeadCount.toLocaleString()} leads detected`
                          : "CSV with name, phone, email, company columns."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {form.csvFileName ? "Replace CSV" : "Upload CSV"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadTemplate}
                      className="text-cyan-600 hover:text-cyan-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Template CSV
                    </Button>
                  </div>
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
              form="create-campaign-form"
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCampaignPage;
