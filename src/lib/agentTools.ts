// Retell general_tools builder — faithful port of VocalMax's tool assembly.
// Produces the tools array passed to create-retell-llm (general_tools): end_call
// and transfer_call.

export interface AgentToolConfig {
  endCall?: { enabled: boolean };
  transfer?: { enabled: boolean; phoneNumber: string };
  /** Tools the agent calls mid-call, by id — see LIVE_TOOLS below. */
  live?: string[];
  /** Needed so Retell's request can be traced back to the right tenant. */
  retellAgentId?: string;
}

// Things the agent can do while the caller is still on the line. Each one is a
// Retell "custom" tool: Retell posts to our agent-tools function, waits, and
// speaks the `say` field back. This is the difference between an agent that
// recites and one that can actually help.
export interface LiveTool {
  id: string;
  label: string;
  /** Shown next to the toggle so it is obvious what turning it on does. */
  summary: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const LIVE_TOOLS: LiveTool[] = [
  {
    id: "look_up_caller",
    label: "Recognise returning callers",
    summary: "Looks the caller up by their number so the agent knows who they are and what was said last time.",
    description:
      "Look up who is calling and what was discussed last time, using the number they are ringing from. " +
      "Call this once at the start, before asking for their name. If it says known is false, they are new.",
    parameters: {
      type: "object",
      properties: {
        from_number: { type: "string", description: "From {{from_number}}." },
        call_id: { type: "string", description: "From {{call_id}}." },
      },
      required: [],
    },
  },
  {
    id: "take_message",
    label: "Take a message",
    summary: "Writes what the caller wanted into Enquiries so somebody can follow it up.",
    description:
      "Take a message for the team when you cannot deal with something yourself. " +
      "Read the message back to the caller before you call this.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "What they want passed on, in their own words." },
        name: { type: "string", description: "Their name, if they gave it." },
        from_number: { type: "string", description: "From {{from_number}}." },
        call_id: { type: "string", description: "From {{call_id}}." },
      },
      required: ["message"],
    },
  },
  {
    id: "book_callback",
    label: "Arrange a callback",
    summary: "Records that the caller wants ringing back, and when.",
    description:
      "Arrange for someone to ring the caller back. Agree roughly when first, then call this.",
    parameters: {
      type: "object",
      properties: {
        when: { type: "string", description: "When they would like ringing back, in their own words." },
        name: { type: "string", description: "Their name, if they gave it." },
        from_number: { type: "string", description: "From {{from_number}}." },
        call_id: { type: "string", description: "From {{call_id}}." },
      },
      required: [],
    },
  },
];

const TOOLS_ENDPOINT =
  `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/agent-tools`;

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

  if (t.transfer?.enabled && t.transfer.phoneNumber) {
    tools.push({
      type: "transfer_call",
      name: "transfer_call",
      description:
        "Transfer the call to a human agent when the prospect specifically asks to speak to someone, or when the call requires escalation.",
      transfer_destination: { type: "predefined", number: t.transfer.phoneNumber },
    });
  }

  // The agent id rides in the URL so our endpoint can tell whose tenant this
  // is before it reads or writes anything.
  for (const id of t.live ?? []) {
    const tool = LIVE_TOOLS.find((x) => x.id === id);
    if (!tool) continue;
    tools.push({
      type: "custom",
      name: tool.id,
      description: tool.description,
      url: t.retellAgentId
        ? `${TOOLS_ENDPOINT}?agent=${encodeURIComponent(t.retellAgentId)}`
        : TOOLS_ENDPOINT,
      method: "POST",
      timeout_ms: 8000,
      // Something has to fill the silence while we hit the database, and the
      // answer is no use unless it is spoken.
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: tool.parameters,
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
  if (t.transfer?.enabled && t.transfer.phoneNumber) {
    lines.push(
      "- **transfer_call**: Call this when the prospect explicitly asks to speak to a human, asks for someone in charge, or the conversation needs escalation.",
    );
  }
  for (const id of t.live ?? []) {
    const tool = LIVE_TOOLS.find((x) => x.id === id);
    if (tool) lines.push(`- **${tool.id}**: ${tool.description}`);
  }
  return lines.length ? `\n\n## Tools\n${lines.join("\n")}` : "";
}

// Reverse of buildAgentTools: read an existing Retell LLM's general_tools back
// into UI toggle state, so the Edit Agent form can show what's actually enabled.
export function parseAgentTools(tools: unknown[] | undefined): {
  endCallEnabled: boolean;
  transferEnabled: boolean;
  transferNumber: string;
  live: string[];
} {
  const list = Array.isArray(tools) ? (tools as Record<string, unknown>[]) : [];
  const transfer = list.find((t) => t.type === "transfer_call");
  const dest = transfer?.transfer_destination as { number?: string } | undefined;
  const known = new Set(LIVE_TOOLS.map((t) => t.id));
  return {
    endCallEnabled: list.some((t) => t.type === "end_call"),
    transferEnabled: !!transfer,
    transferNumber: dest?.number ?? "",
    live: list
      .filter((t) => t.type === "custom" && known.has(String(t.name)))
      .map((t) => String(t.name)),
  };
}

// Strip the delivery/tool guidance blocks this app appends on save, so the Edit
// Agent form shows only the user's own script text (it gets re-appended on save).
export function stripAppendedGuidance(prompt: string): string {
  const idx = prompt.indexOf("\n\n## Delivery Style\n");
  return idx === -1 ? prompt : prompt.slice(0, idx);
}
