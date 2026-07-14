// Retell general_tools builder — faithful port of VocalMax's tool assembly.
// Produces the tools array passed to create-retell-llm (general_tools): end_call,
// Cal.com check_availability + book_appointment, and transfer_call.

export interface AgentToolConfig {
  endCall?: { enabled: boolean };
  calBooking?: { enabled: boolean; calApiKey: string; eventTypeId: string; timezone?: string };
  transfer?: { enabled: boolean; phoneNumber: string };
}

export function buildAgentTools(t: AgentToolConfig): Record<string, unknown>[] {
  const tools: Record<string, unknown>[] = [];

  if (t.endCall?.enabled) {
    tools.push({
      type: "end_call",
      name: "end_call",
      description:
        "End the call cleanly when the conversation goal is achieved, the prospect refuses to continue, or the call has reached a natural conclusion.",
    });
  }

  if (t.calBooking?.enabled && t.calBooking.calApiKey && t.calBooking.eventTypeId) {
    const cal = {
      cal_api_key: t.calBooking.calApiKey,
      event_type_id: Number(t.calBooking.eventTypeId) || t.calBooking.eventTypeId,
      timezone: t.calBooking.timezone || "Europe/London",
    };
    tools.push({
      type: "check_availability_cal",
      name: "check_availability",
      description:
        "Check the user's calendar for open slots in the next 7-14 days. Call this BEFORE book_appointment so you know which times are actually available. Read 2-3 open slots back to the prospect in plain English and let them pick one.",
      ...cal,
    });
    tools.push({
      type: "book_appointment_cal",
      name: "book_appointment",
      description:
        "Book a meeting on the user's Cal.com calendar AFTER the prospect has confirmed a specific date and time from the available slots returned by check_availability. Never invent a time.",
      ...cal,
    });
  }

  if (t.transfer?.enabled && t.transfer.phoneNumber) {
    tools.push({
      type: "transfer_call",
      name: "transfer_call",
      description:
        "Transfer the call to a human agent when the prospect specifically asks to speak to someone, or when the call requires escalation.",
      transfer_destination: { type: "predefined", number: t.transfer.phoneNumber },
    });
  }

  return tools;
}

// Prompt guidance appended to the agent script for each enabled tool (VocalMax o3).
export function buildToolGuidance(t: AgentToolConfig): string {
  const lines: string[] = [];
  if (t.calBooking?.enabled && t.calBooking.calApiKey && t.calBooking.eventTypeId) {
    lines.push(
      '- **check_availability**: When the prospect agrees to a meeting or asks "when can we chat?", call this FIRST to fetch open slots. Then read 2-3 slots back to the prospect in plain English and let them pick one.',
    );
    lines.push(
      "- **book_appointment**: Call this ONLY after the prospect has confirmed a specific date and time from the slots returned by check_availability. Never invent a time.",
    );
  }
  if (t.transfer?.enabled && t.transfer.phoneNumber) {
    lines.push(
      "- **transfer_call**: Call this when the prospect explicitly asks to speak to a human, asks for someone in charge, or the conversation needs escalation.",
    );
  }
  return lines.length ? `\n\n## Tools\n${lines.join("\n")}` : "";
}

// Integrations settings (Cal.com) persisted locally.
export interface IntegrationsSettings {
  calApiKey: string;
  calEventTypeId: string;
  calTimezone: string;
}

const INTEGRATIONS_KEY = "ai_integrations";

export function loadIntegrations(): IntegrationsSettings {
  try {
    const raw = localStorage.getItem(INTEGRATIONS_KEY);
    if (raw) return { calApiKey: "", calEventTypeId: "", calTimezone: "Europe/London", ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return { calApiKey: "", calEventTypeId: "", calTimezone: "Europe/London" };
}

export function saveIntegrations(s: IntegrationsSettings): void {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(s));
}
