import { useEffect, useMemo, useState } from "react";
import { Users, Loader2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listEnquiries, type Enquiry } from "@/services/inboundService";
import { cn } from "@/lib/utils";

// Same classification vocabulary the outbound side uses, so a lead means the
// same thing whichever direction the call went.
const STATUSES = ["Interested", "Not Interested", "Requested Callback", "Voicemail", "Reviewing"] as const;

const statusStyles: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-600",
  "Not Interested": "bg-slate-100 text-slate-600",
  "Requested Callback": "bg-amber-50 text-amber-600",
  Voicemail: "bg-blue-50 text-blue-600",
  Reviewing: "bg-purple-50 text-purple-600",
};

const InboundEnquiriesPage = () => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinguishes "nothing here" from "we could not find out".
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [selected, setSelected] = useState<Enquiry | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRows(await listEnquiries());
      } catch (err) {
        setFailed(true);
        toast.error(err instanceof Error ? err.message : "Could not load enquiries.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "All" && (r.lead_status ?? "") !== status) return false;
      if (!q) return true;
      return [r.name, r.phone, r.summary].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, query, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.lead_status ?? "Reviewing"] = (c[r.lead_status ?? "Reviewing"] ?? 0) + 1;
    return c;
  }, [rows]);

  const exportCsv = () => {
    const data = [
      ["Name", "Phone", "Status", "Sentiment", "When", "Summary"],
      ...filtered.map((r) => [
        r.name ?? "",
        r.phone,
        r.lead_status ?? "",
        r.sentiment ?? "",
        new Date(r.created_at).toISOString(),
        (r.summary ?? "").replace(/"/g, '""'),
      ]),
    ];
    const csv = data.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inbound-enquiries.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Enquiries"
          subtitle="People who rang you, and what the agent learned from them."
          actions={
            <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, number or summary"
              className="pl-9 rounded-xl"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["All", ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
                  status === s ? "bg-cyan-50 text-cyan-600" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                {s}
                {s !== "All" && counts[s] ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {failed ? "Couldn't load your enquiries" : rows.length === 0 ? "No enquiries yet" : "Nothing matches that filter"}
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {rows.length === 0
                  ? "When someone rings one of your numbers, the agent captures their details and they appear here."
                  : "Try a different search or status."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3 font-medium text-slate-500">Caller</th>
                      <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                      <th className="px-6 py-3 font-medium text-slate-500">Sentiment</th>
                      <th className="px-6 py-3 font-medium text-slate-500">When</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-900">{r.name || "Unknown"}</p>
                          <p className="text-xs text-slate-500">{r.phone}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              statusStyles[r.lead_status ?? ""] ?? "bg-slate-100 text-slate-600",
                            )}
                          >
                            {r.lead_status ?? "Reviewing"}
                          </span>
                        </td>
                        <td className="px-6 py-3 capitalize text-slate-600">{r.sentiment ?? "—"}</td>
                        <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setSelected(r)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00D4FF] hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name || selected.phone}</DialogTitle>
                <DialogDescription>
                  {selected.phone} · {new Date(selected.created_at).toLocaleString("en-GB")}
                </DialogDescription>
              </DialogHeader>
              {selected.summary && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Summary</p>
                  <p className="text-sm text-slate-600">{selected.summary}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">Transcript</p>
                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded-xl p-3 max-h-80 overflow-y-auto">
                  {selected.transcript || "No transcript available."}
                </pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InboundEnquiriesPage;
