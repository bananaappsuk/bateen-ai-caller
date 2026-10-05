import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PhoneIncoming, Users, Clock, CheckCircle2, Loader2, Hash, Bot } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getInboundStats, listInboundCalls, type InboundStats, type InboundCall } from "@/services/inboundService";
import { listInboundNumbers, type InboundNumber } from "@/services/inboundService";

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

const InboundOverviewPage = () => {
  const [stats, setStats] = useState<InboundStats | null>(null);
  const [recent, setRecent] = useState<InboundCall[]>([]);
  const [numbers, setNumbers] = useState<InboundNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, calls, nums] = await Promise.all([
          getInboundStats(),
          listInboundCalls(5),
          listInboundNumbers(),
        ]);
        setStats(s);
        setRecent(calls);
        setNumbers(nums);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load your inbound overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tiles = [
    { label: "Calls received", value: stats?.totalCalls ?? 0, icon: PhoneIncoming, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Answered", value: stats?.answered ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Enquiries captured", value: stats?.enquiries ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Average length", value: mmss(stats?.avgDurationSec ?? 0), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const unassigned = numbers.filter((n) => !n.agent_id).length;

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Inbound Overview"
          subtitle="Calls people make to you, answered by your AI agents."
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading inbound activity…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              {tiles.map((t) => (
                <Card key={t.label} className="bg-white rounded-2xl border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className={`h-10 w-10 rounded-xl ${t.bg} flex items-center justify-center mb-3`}>
                      <t.icon className={`h-5 w-5 ${t.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{t.value}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{t.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {numbers.length === 0 ? (
              <Card className="bg-white rounded-2xl border-slate-100 shadow-sm mb-6">
                <CardContent className="p-10 text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <Hash className="h-7 w-7 text-slate-300" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">No inbound numbers yet</h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Add a number and point it at an agent, and that agent will answer whenever someone
                    rings it.
                  </p>
                  <Link
                    to="/inbound/numbers"
                    className="inline-block mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90"
                  >
                    Set up a number
                  </Link>
                </CardContent>
              </Card>
            ) : unassigned > 0 ? (
              <Card className="bg-amber-50 rounded-2xl border-amber-100 shadow-sm mb-6">
                <CardContent className="p-4 flex items-center gap-3">
                  <Bot className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    {unassigned} number{unassigned === 1 ? " has" : "s have"} no agent assigned, so calls to
                    {unassigned === 1 ? " it" : " them"} won't be answered.{" "}
                    <Link to="/inbound/numbers" className="font-semibold underline">
                      Assign an agent
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Recent calls</h2>
                  <Link to="/inbound/calls" className="text-sm font-medium text-[#00D4FF] hover:underline">
                    View all
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    No inbound calls yet. They'll appear here as soon as someone rings one of your numbers.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recent.map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {c.lead_name || c.from_number || "Unknown caller"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {c.summary || c.status || "No summary yet"}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(c.created_at).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InboundOverviewPage;
