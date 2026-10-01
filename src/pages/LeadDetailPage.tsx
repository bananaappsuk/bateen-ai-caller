import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {  useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser } from "@/lib/devAuth";
import { getLead, type LeadRow } from "@/services/leadsService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  ArrowLeft,
  Loader2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];


const classificationStyles: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-600",
  "Not Interested": "bg-red-50 text-red-600",
  "Requested Callback": "bg-amber-50 text-amber-600",
  Voicemail: "bg-purple-50 text-purple-600",
  Reviewing: "bg-slate-100 text-slate-500",
};

const LeadDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getDevUser();
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [call, setCall] = useState<CallRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const l = await getLead(id);
        if (cancelled) return;
        setLead(l);
        if (l?.retell_call_id) {
          const { data } = await supabase
            .from("calls")
            .select("*")
            .eq("retell_call_id", l.retell_call_id)
            .limit(1);
          if (!cancelled) setCall(data?.[0] ?? null);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load lead.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;


  const transcript = lead?.transcript ?? call?.transcript ?? null;
  const summary = lead?.summary ?? call?.summary ?? null;
  const recording = call?.recording_url ?? null;
  const customData = (lead?.custom_data as Record<string, string> | null) ?? {};

  return (
    <DashboardLayout activeHref="/dashboard/leads">
        <div className="w-full px-6 py-8">
          {loading ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !lead ? (
            <div className="py-24 text-center text-slate-500">Lead not found.</div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => navigate("/dashboard/leads")}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{lead.name ?? lead.phone}</h1>
                  {lead.lead_status && (
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                        classificationStyles[lead.lead_status] ?? "bg-slate-100 text-slate-500",
                      )}
                    >
                      {lead.lead_status}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Phone", value: lead.phone },
                  { label: "Call status", value: lead.status },
                  { label: "Attempts", value: String(lead.attempt_count ?? 0) },
                  { label: "Sentiment", value: lead.sentiment ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 capitalize truncate">{s.value}</p>
                  </div>
                ))}
              </div>

              {recording && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-cyan-500" /> Call recording
                  </h2>
                  <audio controls src={recording} className="w-full" />
                </div>
              )}

              {summary && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-2">Call summary</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 mb-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">Transcript</h2>
                {transcript ? (
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{transcript}</pre>
                ) : (
                  <p className="text-sm text-slate-400">No transcript available yet.</p>
                )}
              </div>

              {Object.keys(customData).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Lead data</h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(customData).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k}</dt>
                        <dd className="text-sm text-slate-900 mt-0.5">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}
        </div>
      
    </DashboardLayout>
  );
};

export default LeadDetailPage;
