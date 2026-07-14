// Shared lead-enrichment logic used by both the retell-webhook and classify-lead
// edge functions: AI classification of a call transcript + hot-lead email alert.
// Degrades gracefully — with no OPENAI_API_KEY it returns "Reviewing"; with no
// RESEND_API_KEY / HOT_LEAD_EMAIL it skips the email.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

export type Classification =
  | "Interested"
  | "Not Interested"
  | "Requested Callback"
  | "Voicemail"
  | "Reviewing";

const LABELS: Classification[] = ["Interested", "Not Interested", "Requested Callback", "Voicemail"];

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function classifyTranscript(
  transcript: string,
  interested: string | null,
  notInterested: string | null,
): Promise<Classification> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || !transcript.trim()) return "Reviewing";
  const system = [
    "You classify an outbound sales/outreach phone call transcript into exactly one label:",
    '"Interested", "Not Interested", "Requested Callback", or "Voicemail".',
    `Interested means: ${interested || "the person shows interest, wants more info, or agrees to a next step"}.`,
    `Not Interested means: ${notInterested || "the person declines or is not interested"}.`,
    "Requested Callback: they ask to be called back later.",
    "Voicemail: the call reached a voicemail / answering machine.",
    'Respond ONLY with JSON: {"label":"<one of the four>"}.',
  ].join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: transcript.slice(0, 8000) },
        ],
      }),
    });
    if (!res.ok) return "Reviewing";
    const data = await res.json();
    const label = JSON.parse(data.choices?.[0]?.message?.content ?? "{}").label;
    return LABELS.includes(label) ? label : "Reviewing";
  } catch {
    return "Reviewing";
  }
}

async function sendHotLeadEmail(
  lead: { id: string; name: string | null; phone: string },
  label: Classification,
): Promise<void> {
  const host = Deno.env.get("SMTP_HOST");
  const to = Deno.env.get("HOT_LEAD_EMAIL");
  if (!host || !to) return;
  if (label !== "Interested" && label !== "Requested Callback") return;

  const port = Number(Deno.env.get("SMTP_PORT") || "587");
  const username = Deno.env.get("SMTP_EMAIL_USER") || Deno.env.get("SMTP_USER") || "";
  const password = Deno.env.get("SMTP_EMAIL_PASSWORD") || Deno.env.get("SMTP_PASS") || "";
  const from = Deno.env.get("SMTP_FROM") || username;
  const implicitTls =
    (Deno.env.get("SMTP_SSL_TLS") || "").toLowerCase() === "true" || port === 465;
  const appUrl = Deno.env.get("APP_URL") || "";
  const html = `<div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:12px;max-width:600px">
    <h2 style="color:#0f172a;margin-top:0">New ${label} Lead Detected</h2>
    <p style="color:#64748b">Your AI agent just identified a ${label.toLowerCase()} lead.</p>
    <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0">
      <p style="margin:5px 0"><strong>Name:</strong> ${lead.name || "Unknown"}</p>
      <p style="margin:5px 0"><strong>Phone:</strong> ${lead.phone}</p>
      <p style="margin:5px 0"><strong>Status:</strong> ${label}</p>
    </div>
    ${appUrl ? `<a href="${appUrl}/dashboard/leads/${lead.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold">View Lead Details</a>` : ""}
  </div>`;

  // SMTP send (matches VocalMax's Trigger-Email-over-SMTP delivery).
  // Send via nodemailer (proven reliable against Outlook 587 STARTTLS). Best-effort:
  // a delivery failure must never break classification (the label is already saved).
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: implicitTls, // true for 465, false for 587 STARTTLS
      requireTLS: !implicitTls,
      auth: username ? { user: username, pass: password } : undefined,
      tls: { ciphers: "TLSv1.2" },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 12000,
    });
    await transporter.sendMail({
      from,
      to,
      subject: `🔥 New ${label} Lead: ${lead.name || lead.phone}`,
      html,
    });
  } catch {
    // non-fatal — email delivery is best-effort
  }
}

// Classify a lead from its stored transcript against its campaign's criteria,
// persist the label, and fire a hot-lead alert for Interested / Requested Callback.
export async function classifyAndNotify(
  supabase: SupabaseClient,
  leadId: string,
): Promise<Classification | null> {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null;

  let interested: string | null = null;
  let notInterested: string | null = null;
  if (lead.campaign_id) {
    const { data: c } = await supabase
      .from("campaigns")
      .select("interested_description,not_interested_description")
      .eq("campaign_id", lead.campaign_id)
      .maybeSingle();
    interested = c?.interested_description ?? null;
    notInterested = c?.not_interested_description ?? null;
  }

  const label = await classifyTranscript(lead.transcript ?? "", interested, notInterested);
  await supabase.from("leads").update({ lead_status: label }).eq("id", leadId);
  await sendHotLeadEmail({ id: lead.id, name: lead.name, phone: lead.phone }, label);
  return label;
}
