import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PhoneOutgoing, Loader2, Search, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { listOutboundCalls, type OutboundCall } from "@/services/callsService";
import { cn } from "@/lib/utils";

const duration = (ms: number | null) => {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const money = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);

const OutboundCallsPage = () => {
  const [calls, setCalls] = useState<OutboundCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OutboundCall | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCalls(await listOutboundCalls());
      } catch (err) {
        setFailed(true);
        toast.error(err instanceof Error ? err.message : "Could not load calls.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) =>
      [c.to_number, c.agent_name, c.lead_name, c.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [calls, query]);

  const totals = useMemo(() => {
    const withDuration = filtered.filter((c) => c.duration_ms);
    const spent = filtered.reduce((n, c) => n + (c.cost_cents ?? 0), 0);
    const connected = filtered.filter((c) => (c.duration_ms ?? 0) > 0).length;
    return {
      calls: filtered.length,
      connected,
      avgSeconds: withDuration.length
        ? Math.round(withDuration.reduce((n, c) => n + (c.duration_ms ?? 0), 0) / withDuration.length / 1000)
        : 0,
      spent,
    };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ["When", "Number", "Lead", "Agent", "Status", "Seconds", "Cost", "Summary"],
      ...filtered.map((c) => [
        new Date(c.created_at).toLocaleString("en-GB"),
        c.to_number ?? "", c.lead_name ?? "", c.agent_name ?? "", c.status ?? "",
        String(Math.round((c.duration_ms ?? 0) / 1000)),
        c.cost_cents == null ? "" : (c.cost_cents / 100).toFixed(2),
        (c.summary ?? "").replace(/"/g, '""'),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `outbound-calls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout activeHref="/dashboard/calls">
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Outbound Calls"
          subtitle="Every call your campaigns made, with recording and transcript."
          actions={
            <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Calls", value: totals.calls },
            { label: "Connected", value: totals.connected },
            { label: "Average length", value: `${Math.floor(totals.avgSeconds / 60)}m ${String(totals.avgSeconds % 60).padStart(2, "0")}s` },
            { label: "Spent", value: money(totals.spent) },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, lead, agent or summary"
            className="pl-9 rounded-xl"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading calls…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <PhoneOutgoing className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {failed ? "Couldn't load your calls" : calls.length === 0 ? "No outbound calls yet" : "No calls match that search"}
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {calls.length === 0
                  ? "Start a campaign and every call it makes appears here with transcript and recording."
                  : "Try a different search."}
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
                      {["Number", "Lead", "Agent", "Status", "Length", "Cost", "When", ""].map((h) => (
                        <th key={h} className="px-6 py-3 font-medium text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 font-medium text-slate-900">{c.to_number ?? "—"}</td>
                        <td className="px-6 py-3 text-slate-600">{c.lead_name ?? "—"}</td>
                        <td className="px-6 py-3 text-slate-600">{c.agent_name ?? "—"}</td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            c.call_successful ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                          )}>
                            {c.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{duration(c.duration_ms)}</td>
                        <td className="px-6 py-3 text-slate-600">{money(c.cost_cents)}</td>
                        <td className="px-6 py-3 text-slate-500">
                          {new Date(c.created_at).toLocaleString("en-GB", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setSelected(c)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700"
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
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.lead_name || selected.to_number || "Outbound call"}</DialogTitle>
                <DialogDescription>
                  {new Date(selected.created_at).toLocaleString("en-GB")} · {duration(selected.duration_ms)} ·{" "}
                  {money(selected.cost_cents)} · {selected.agent_name || "No agent"}
                </DialogDescription>
              </DialogHeader>
              {selected.summary && (
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{selected.summary}</p>
              )}
              {selected.recording_url && (
                <audio controls src={selected.recording_url} className="w-full" />
              )}
              {selected.transcript ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{selected.transcript}</pre>
              ) : (
                <p className="text-sm text-slate-400">No transcript for this call.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default OutboundCallsPage;
