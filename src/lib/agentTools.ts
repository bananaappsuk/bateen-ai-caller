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

// Delivery guardrail appended to every agent's prompt so scripts written in
// dialogue format (e.g. `Mia: "Hi there"`) don't get spoken literally.
export function buildDeliveryGuidance(): string {
  return (
    "\n\n## Delivery Style\n" +
    '- Never prefix a line with your own name or a speaker label (e.g. "Mia:"), and never wrap what you say in quotation marks — those are script formatting, not things to say out loud. Speak only the natural words a person would say on a call.\n' +
    "- State your name once, in your opening line. Do not repeat your own name again for the rest of the call unless the caller directly asks who they're speaking to or seems unsure."
  );
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

// Reverse of buildAgentTools: read an existing Retell LLM's general_tools back
// into UI toggle state, so the Edit Agent form can show what's actually enabled.
export function parseAgentTools(tools: unknown[] | undefined): {
  endCallEnabled: boolean;
  bookCalEnabled: boolean;
  transferEnabled: boolean;
  transferNumber: string;
} {
  const list = Array.isArray(tools) ? (tools as Record<string, unknown>[]) : [];
  const transfer = list.find((t) => t.type === "transfer_call");
  const dest = transfer?.transfer_destination as { number?: string } | undefined;
  return {
    endCallEnabled: list.some((t) => t.type === "end_call"),
    bookCalEnabled: list.some((t) => t.type === "book_appointment_cal"),
    transferEnabled: !!transfer,
    transferNumber: dest?.number ?? "",
  };
}

// Strip the delivery/tool guidance blocks this app appends on save, so the Edit
// Agent form shows only the user's own script text (it gets re-appended on save).
export function stripAppendedGuidance(prompt: string): string {
  const idx = prompt.indexOf("\n\n## Delivery Style\n");
  return idx === -1 ? prompt : prompt.slice(0, idx);
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
