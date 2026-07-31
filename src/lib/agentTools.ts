// Retell general_tools builder — faithful port of VocalMax's tool assembly.
// Produces the tools array passed to create-retell-llm (general_tools): end_call
// and transfer_call.

export interface AgentToolConfig {
  endCall?: { enabled: boolean };
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
  transferEnabled: boolean;
  transferNumber: string;
} {
  const list = Array.isArray(tools) ? (tools as Record<string, unknown>[]) : [];
  const transfer = list.find((t) => t.type === "transfer_call");
  const dest = transfer?.transfer_destination as { number?: string } | undefined;
  return {
    endCallEnabled: list.some((t) => t.type === "end_call"),
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
