import { useEffect, useMemo, useState } from "react";
import { PhoneIncoming, Loader2, FileText, Play, Search } from "lucide-react";
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
import { listInboundCalls, type InboundCall } from "@/services/inboundService";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ended: "bg-emerald-50 text-emerald-600",
  ongoing: "bg-cyan-50 text-cyan-600",
  registered: "bg-slate-100 text-slate-600",
  error: "bg-red-50 text-red-600",
  not_connected: "bg-amber-50 text-amber-600",
};

function duration(ms: number | null) {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

const InboundCallsPage = () => {
  const [calls, setCalls] = useState<InboundCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InboundCall | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCalls(await listInboundCalls());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) =>
      [c.from_number, c.to_number, c.lead_name, c.summary, c.agent_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [calls, query]);

  const exportCsv = () => {
    const rows = [
      ["When", "From", "To", "Agent", "Status", "Duration", "Summary"],
      ...filtered.map((c) => [
        new Date(c.created_at).toISOString(),
        c.from_number ?? "",
        c.to_number ?? "",
        c.agent_name ?? "",
        c.status ?? "",
        duration(c.duration_ms),
        (c.summary ?? "").replace(/"/g, '""'),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inbound-calls.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Inbound Calls"
          subtitle="Every call answered by your agents, with recording and transcript."
          actions={
            <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Button>
          }
        />

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search caller, agent or summary"
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
                <PhoneIncoming className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {calls.length === 0 ? "No inbound calls yet" : "No calls match that search"}
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {calls.length === 0
                  ? "Once a number is pointed at an agent, calls to it appear here with transcript and recording."
                  : "Try a different search term."}
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
                      <th className="px-6 py-3 font-medium text-slate-500">Agent</th>
                      <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                      <th className="px-6 py-3 font-medium text-slate-500">Length</th>
                      <th className="px-6 py-3 font-medium text-slate-500">When</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-900">{c.lead_name || c.from_number || "Unknown"}</p>
                          {c.lead_name && c.from_number && (
                            <p className="text-xs text-slate-500">{c.from_number}</p>
                          )}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{c.agent_name || "—"}</td>
                        <td className="px-6 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              statusStyles[c.status ?? ""] ?? "bg-slate-100 text-slate-600",
                            )}
                          >
                            {c.status ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-3 tabular-nums text-slate-600">{duration(c.duration_ms)}</td>
                        <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setSelected(c)}
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
                <DialogTitle>{selected.lead_name || selected.from_number || "Inbound call"}</DialogTitle>
                <DialogDescription>
                  {new Date(selected.created_at).toLocaleString("en-GB")} · {duration(selected.duration_ms)} ·{" "}
                  {selected.agent_name || "No agent"}
                </DialogDescription>
              </DialogHeader>

              {selected.recording_url && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5" /> Recording
                  </p>
                  <audio src={selected.recording_url} controls className="w-full" />
                </div>
              )}

              {selected.summary && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Summary</p>
                  <p className="text-sm text-slate-600">{selected.summary}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">Transcript</p>
                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded-xl p-3 max-h-80 overflow-y-auto">
                  {selected.transcript || "No transcript available for this call."}
                </pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InboundCallsPage;
