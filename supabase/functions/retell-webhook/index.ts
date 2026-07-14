// Retell webhook receiver. Retell POSTs { event, call } for call_started /
// call_ended / call_analyzed. We log every delivery, enrich the lead + calls row
// with transcript / recording / summary / sentiment, finalize the lead's dialer
// status (so calls resolve even if no browser tab is running the dialer), and
// classify on call_analyzed.
//
// NOTE: signature verification is not yet enforced — add x-retell-signature HMAC
// verification before exposing this beyond trusted use.
import { adminClient, classifyAndNotify } from "../_shared/enrich.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retell-signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LeadStatus = "completed" | "no-answer" | "failed";

function mapEndedCallToStatus(call: { call_status?: string; disconnection_reason?: string }): LeadStatus {
  const reason = (call.disconnection_reason || "").toLowerCase();
  if (call.call_status === "not_connected") return "no-answer";
  if (
    reason.includes("permission_denied") ||
    reason.includes("failed") ||
    reason.includes("error") ||
    call.call_status === "error"
  ) return "failed";
  if (
    reason.includes("no_answer") ||
    reason.includes("busy") ||
    reason === "dial_no_answer" ||
    reason === "dial_busy"
  ) return "no-answer";
  return "completed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { event?: string; call?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const event = payload.event ?? "unknown";
  const call = (payload.call ?? {}) as Record<string, unknown>;
  const callId = (call.call_id as string) ?? null;
  const analysis = (call.call_analysis ?? {}) as Record<string, unknown>;
  const supabase = adminClient();

  await supabase.from("webhook_events").insert({
    retell_call_id: callId,
    event_type: event,
    payload: payload as unknown as Record<string, unknown>,
  });

  // Locate the lead (metadata.leadId first, then by retell_call_id).
  const metadata = (call.metadata ?? {}) as Record<string, unknown>;
  const leadId = metadata.leadId as string | undefined;
  let lead: Record<string, unknown> | null = null;
  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
    lead = data;
  }
  if (!lead && callId) {
    const { data } = await supabase.from("leads").select("*").eq("retell_call_id", callId).maybeSingle();
    lead = data;
  }

  // Enrich the calls row.
  if (callId) {
    await supabase
      .from("calls")
      .update({
        status: call.call_status as string,
        transcript: (call.transcript as string) ?? null,
        recording_url: (call.recording_url as string) ?? null,
        summary: (analysis.call_summary as string) ?? null,
        call_successful: (analysis.call_successful as boolean) ?? null,
        has_transcript: !!call.transcript,
      })
      .eq("retell_call_id", callId);
  }

  if (lead) {
    const patch: Record<string, unknown> = {};
    if (call.transcript) patch.transcript = call.transcript;
    if (analysis.call_summary) patch.summary = analysis.call_summary;
    if (analysis.user_sentiment) patch.sentiment = analysis.user_sentiment;

    // Finalize dialer status if the call ended while the lead is still "calling".
    const status = call.call_status as string | undefined;
    if ((event === "call_ended" || event === "call_analyzed") && lead.status === "calling") {
      const mapped = mapEndedCallToStatus(call);
      if (mapped === "completed") {
        patch.status = "completed";
        patch.next_retry_at = null;
      } else {
        // Let the dialer's own retry scheduling handle attempts; just record outcome.
        const attempts = (lead.attempt_count as number) ?? 1;
        const { data: c } = lead.campaign_id
          ? await supabase
              .from("campaigns")
              .select("max_attempts,retry_delay_minutes")
              .eq("campaign_id", lead.campaign_id as string)
              .maybeSingle()
          : { data: null };
        const maxAttempts = c?.max_attempts ?? 3;
        const retryDelay = c?.retry_delay_minutes ?? 60;
        if (attempts >= maxAttempts) {
          patch.status = "unresponsive";
          patch.unresponsive_at = new Date().toISOString();
          patch.next_retry_at = null;
        } else {
          patch.status = mapped;
          patch.next_retry_at = new Date(Date.now() + retryDelay * 60_000).toISOString();
        }
      }
      void status;
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from("leads").update(patch).eq("id", lead.id as string);
    }
    if (event === "call_analyzed") {
      await classifyAndNotify(supabase, lead.id as string);
    }
  }

  return json({ ok: true });
});
