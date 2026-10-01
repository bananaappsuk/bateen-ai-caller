import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {  useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser } from "@/lib/devAuth";
import { listLeads, type LeadRow, type LeadClassification } from "@/services/leadsService";
import { listCampaigns } from "@/services/campaignsService";
import {
  Users,
  Download,
  Star,
  PhoneOff,
  PhoneCall,
  Voicemail,
  Loader2,
  UserRound,
  RefreshCw,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/lib/creditsContext";


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
  const { credits } = useCredits();
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
    <DashboardLayout>
        <div className="w-full px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Scored Leads</h1>
              <p className="text-sm text-slate-500 mt-1">Leads classified by your AI from every call.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                {credits.toLocaleString()} Credits
              </div>
              <button
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Settings"
                onClick={() => navigate("/dashboard/settings")}
              >
                <Settings className="h-4 w-4" />
              </button>
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
      
    </DashboardLayout>
  );
};

export default LeadsPage;
