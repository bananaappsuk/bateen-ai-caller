import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { parseLeadsCsv, fileToCsvText, type SkippedRow } from "@/services/leadsCsv";
import { createCampaign } from "@/services/campaignsService";
import { insertLeads } from "@/services/leadsService";
import { listAgents, syncAgentsFromRetell, type AgentRow } from "@/services/agentsService";
import { getBillingAccount } from "@/services/creditsService";
import { limitsFor, type PlanLimits } from "@/lib/plans";
import { loadDynamicVars, saveDynamicVars } from "@/lib/dynamicVars";
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
  Loader2,
  Info,
  AlertTriangle,
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

const COUNTRIES = [
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+1", label: "United States / Canada (+1)" },
  { code: "+91", label: "India (+91)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+971", label: "United Arab Emirates (+971)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+49", label: "Germany (+49)" },
];

// Phone values are wrapped as ="…" — Excel treats that as a text formula
// result and won't reformat it into scientific notation on open/save, unlike a
// bare long digit string. The parser below unwraps this automatically.
const TEMPLATE_CSV =
  'name,phone,email,company\nJane Doe,="+14155550101",jane@example.com,Acme Inc\nJohn Smith,="+14155550102",john@example.com,Globex\n';

const defaultForm = {
  name: "",
  agentId: "",
  concurrency: 10,
  maxAttempts: 3,
  retryDelayMinutes: 60,
  interestedDescription: "",
  notInterestedDescription: "",
  country: "+44",
  csvFileName: "",
};

const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(defaultForm);
  const [csvText, setCsvText] = useState<string>("");
  const [csvSummary, setCsvSummary] = useState<{ valid: number; invalid: number } | null>(null);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [showSkipped, setShowSkipped] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [limits, setLimits] = useState<PlanLimits>(() => limitsFor(null));
  const [varsText, setVarsText] = useState(() =>
    Object.entries(loadDynamicVars())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
  );

  const handleVarsChange = (text: string) => {
    setVarsText(text);
    const obj: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k) obj[k] = v;
      }
    }
    saveDynamicVars(obj);
  };

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Ensure the user's Retell agents are available locally.
        await syncAgentsFromRetell().catch(() => undefined);
        const list = await listAgents();
        if (!cancelled) setAgents(list);
        const acct = await getBillingAccount().catch(() => null);
        if (!cancelled && acct) setLimits(limitsFor(acct.plan_tier));
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check skipped rows if the user changes the default country code after
  // uploading — some "invalid" numbers are just missing their country code.
  useEffect(() => {
    if (!csvText) return;
    const parsed = parseLeadsCsv(csvText, form.country);
    setCsvSummary({ valid: parsed.leads.length, invalid: parsed.invalidCount });
    setSkippedRows(parsed.skipped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country]);

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
    let text: string;
    try {
      // Handles .csv as text and .xlsx/.xls/.ods via SheetJS.
      text = await fileToCsvText(file);
    } catch {
      toast.error("Couldn't read that file. Save it as .csv or .xlsx and try again.");
      return;
    }
    setCsvText(text);
    const parsed = parseLeadsCsv(text, form.country);
    setCsvSummary({ valid: parsed.leads.length, invalid: parsed.invalidCount });
    setSkippedRows(parsed.skipped);
    setShowSkipped(false);
    setForm((prev) => ({ ...prev, csvFileName: file.name }));
    if (!parsed.phoneColumn) {
      toast.error(
        parsed.headers.length
          ? `No phone column found. Columns detected: ${parsed.headers.join(", ")}. Rename one to "phone".`
          : "No columns could be read from that file. Make sure the first row is a header row (e.g. name, phone).",
      );
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || submitting) return;

    const parsed = csvText ? parseLeadsCsv(csvText, form.country) : null;
    const leads = parsed?.leads ?? [];

    if (leads.length > limits.maxLeadsPerUpload) {
      toast.error(
        `Your plan allows ${limits.maxLeadsPerUpload.toLocaleString()} leads per upload. Trim the CSV or upgrade your plan.`,
      );
      return;
    }

    setSubmitting(true);
    const loadingId = toast.loading("Creating campaign…");
    try {
      const campaign = await createCampaign({
        name: form.name.trim(),
        agent_id: form.agentId || null,
        concurrency: Math.min(form.concurrency, limits.concurrency),
        max_attempts: form.maxAttempts,
        retry_delay_minutes: form.retryDelayMinutes,
        interested_description: form.interestedDescription.trim() || null,
        not_interested_description: form.notInterestedDescription.trim() || null,
        country_code: form.country,
        total_leads: leads.length,
        status: "draft",
      });

      if (leads.length > 0) {
        const inserted = await insertLeads(campaign.campaign_id, leads);
        toast.success(
          `Campaign created with ${inserted} lead${inserted === 1 ? "" : "s"}.`,
          { id: loadingId },
        );
      } else {
        toast.success("Campaign created (no leads yet).", { id: loadingId });
      }
      navigate(`/dashboard/campaigns/${campaign.campaign_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create campaign.";
      toast.error(msg, { id: loadingId });
      setSubmitting(false);
    }
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
      <main className="flex-1 ml-[260px] h-screen flex flex-col">
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

        <form id="create-campaign-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
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
              {loadingAgents ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing agents from Retell…
                </div>
              ) : agents.length > 0 ? (
                <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        {a.phone_number ? ` · ${a.phone_number}` : " · no number"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-slate-500">
                  No agents found. Create one on the AI Agents page first.
                </p>
              )}
              <p className="text-xs text-slate-500">
                The campaign dials from the agent's assigned phone number.
              </p>
            </div>

            {/* Concurrency + Retries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concurrency">Concurrent Calls</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min={1}
                  max={50}
                  value={form.concurrency}
                  onChange={(e) => setForm({ ...form, concurrency: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Simultaneous calls.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxAttempts}
                  onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Retries per lead.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryDelay">Retry Delay (min)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min={1}
                  value={form.retryDelayMinutes}
                  onChange={(e) => setForm({ ...form, retryDelayMinutes: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Wait between tries.</p>
              </div>
            </div>

            {/* Interested */}
            <div className="space-y-2">
              <Label htmlFor="interested">Interested Lead Description</Label>
              <Textarea
                id="interested"
                value={form.interestedDescription}
                onChange={(e) => setForm({ ...form, interestedDescription: e.target.value })}
                placeholder="What signals mark a lead as interested? (used by the AI to classify calls)"
                rows={3}
              />
            </div>

            {/* Not Interested */}
            <div className="space-y-2">
              <Label htmlFor="notInterested">Not Interested Lead Description</Label>
              <Textarea
                id="notInterested"
                value={form.notInterestedDescription}
                onChange={(e) => setForm({ ...form, notInterestedDescription: e.target.value })}
                placeholder="What signals mark a lead as not interested?"
                rows={3}
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Default Country Code</Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
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
            </div>

            {/* Default call variables */}
            <div className="space-y-2">
              <Label htmlFor="dynvars">Default Call Variables</Label>
              <Textarea
                id="dynvars"
                value={varsText}
                onChange={(e) => handleVarsChange(e.target.value)}
                placeholder={"company=Acme Ltd\noffer=20% discount"}
                rows={3}
              />
              <p className="text-xs text-slate-500">
                One per line as <code>key=value</code>. Usable as {"{{key}}"} in your agent script and
                merged into every call (CSV columns override these).
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
                        {csvSummary
                          ? `${csvSummary.valid.toLocaleString()} valid · ${csvSummary.invalid} skipped`
                          : "CSV with name, phone, email, company columns."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.xlsm,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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

              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  Opening this CSV in Excel? Format the phone column as Text before typing numbers into it
                  (or prefix each number with an apostrophe, e.g. <code>'+447700900123</code>). Otherwise Excel
                  can silently rewrite long phone numbers as scientific notation (e.g. <code>4.47887E+11</code>),
                  which can't be recovered once saved.
                </p>
              </div>

              {skippedRows.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <button
                    type="button"
                    onClick={() => setShowSkipped((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {skippedRows.length} row{skippedRows.length === 1 ? "" : "s"} skipped — why?
                    </span>
                    <span className="text-xs font-medium text-amber-700">
                      {showSkipped ? "Hide" : "Show"}
                    </span>
                  </button>
                  {showSkipped && (
                    <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {skippedRows.map((s, i) => (
                        <li key={i} className="text-xs text-amber-800 border-t border-amber-100 pt-2 first:border-0 first:pt-0">
                          <span className="font-semibold">Row {s.row}</span>
                          {s.value ? <span className="font-mono"> ("{s.value}")</span> : null}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="shrink-0 bg-white border-t border-slate-100 px-6 sm:px-10 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-campaign-form"
              disabled={submitting}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
            >
              {submitting ? "Creating…" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCampaignPage;
