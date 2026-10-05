import { describe, it, expect } from "vitest";
import {
  composePrompt, decomposePrompt, detectPlaybook, PLAYBOOKS, VOICE_CORE_RULES,
} from "./voicePlaybooks";
import { buildAgentTools, parseAgentTools, buildToolGuidance, LIVE_TOOLS } from "./agentTools";

// What makes an agent conversational rather than scripted: it is told how to
// behave on a telephone, and it can actually do things while the caller waits.
// Before this an agent got only whatever the user typed in one box, and could
// do nothing but hang up or transfer.

describe("the prompt an agent is given", () => {
  it("keeps the user's own words first — it is their agent", () => {
    const out = composePrompt("You answer for Bateen College.", "reception");
    expect(out.indexOf("You answer for Bateen College.")).toBe(0);
  });

  it("always adds the speaking rules, whichever playbook is chosen", () => {
    for (const p of PLAYBOOKS) {
      expect(composePrompt("Mine.", p.id)).toContain(VOICE_CORE_RULES);
    }
  });

  it("adds the chosen playbook's instructions", () => {
    const reception = PLAYBOOKS.find((p) => p.id === "reception")!;
    expect(composePrompt("Mine.", "reception")).toContain(reception.body);
  });

  it("adds no playbook when none is chosen, but still teaches it to speak", () => {
    const out = composePrompt("Mine.", "none");
    expect(out).toContain(VOICE_CORE_RULES);
    for (const p of PLAYBOOKS.filter((p) => p.body)) expect(out).not.toContain(p.body);
  });

  // The rules exist because voice is not chat. These are the ones that bite.
  it.each([
    ["one question at a time", /one question at a time/i],
    ["no markdown read aloud", /no bullet points|no markdown/i],
    ["admits to being AI", /are a real person or AI/i],
    ["hands over when distressed", /distressed/i],
    ["never invents facts", /never invent a price/i],
    ["stops when interrupted", /if you are interrupted/i],
  ])("teaches it to %s", (_label, pattern) => {
    expect(VOICE_CORE_RULES).toMatch(pattern);
  });

  it("gives back only the user's words when editing", () => {
    const stored = composePrompt("You answer for Bateen College.", "support");
    expect(decomposePrompt(stored)).toBe("You answer for Bateen College.");
  });

  it("remembers which playbook was used", () => {
    expect(detectPlaybook(composePrompt("x", "bookings"))).toBe("bookings");
    expect(detectPlaybook(composePrompt("x", "none"))).toBe("none");
  });

  it("survives a round trip without the user's text drifting", () => {
    const mine = "Answer for the admissions office.\n\nMention open days.";
    expect(decomposePrompt(composePrompt(mine, "enquiries"))).toBe(mine);
  });
});

describe("what the agent can do mid-call", () => {
  const cfg = { live: ["look_up_caller", "take_message"], retellAgentId: "agent_abc" };

  it("builds a Retell custom tool per enabled ability", () => {
    const tools = buildAgentTools(cfg);
    expect(tools.map((t) => t.name)).toEqual(["look_up_caller", "take_message"]);
    for (const t of tools) expect(t.type).toBe("custom");
  });

  it("points each tool at our endpoint, carrying the agent id", () => {
    // Without the id our endpoint cannot tell whose tenant is calling until the
    // call_started webhook lands, which is a race against the caller talking.
    for (const t of buildAgentTools(cfg)) {
      expect(String(t.url)).toContain("/functions/v1/agent-tools");
      expect(String(t.url)).toContain("agent=agent_abc");
    }
  });

  it("asks Retell to talk while the tool runs, and to say the answer", () => {
    for (const t of buildAgentTools(cfg)) {
      expect(t.speak_during_execution).toBe(true);
      expect(t.speak_after_execution).toBe(true);
    }
  });

  it("declares parameters so the model knows what to send", () => {
    const [lookup] = buildAgentTools({ live: ["look_up_caller"] });
    const params = lookup.parameters as { properties: Record<string, unknown> };
    expect(Object.keys(params.properties)).toContain("from_number");
  });

  it("takes the caller's number from Retell's own variable, not the model's guess", () => {
    const [lookup] = buildAgentTools({ live: ["look_up_caller"] });
    const params = lookup.parameters as { properties: Record<string, { description: string }> };
    expect(params.properties.from_number.description).toContain("{{from_number}}");
  });

  it("builds nothing for an ability that does not exist", () => {
    expect(buildAgentTools({ live: ["make_tea"] })).toEqual([]);
  });

  it("leaves end_call and transfer_call working as before", () => {
    const tools = buildAgentTools({
      endCall: { enabled: true },
      transfer: { enabled: true, phoneNumber: "+447700900123" },
    });
    expect(tools.map((t) => t.type)).toEqual(["end_call", "transfer_call"]);
  });

  it("tells the agent in its prompt when to use each tool", () => {
    const guidance = buildToolGuidance(cfg);
    expect(guidance).toContain("look_up_caller");
    expect(guidance).toContain("take_message");
  });
});

describe("reading an existing agent's tools back", () => {
  it("recovers which abilities were switched on", () => {
    const tools = buildAgentTools({
      endCall: { enabled: true },
      live: ["book_callback"],
      retellAgentId: "agent_abc",
    });
    const parsed = parseAgentTools(tools);
    expect(parsed.live).toEqual(["book_callback"]);
    expect(parsed.endCallEnabled).toBe(true);
  });

  it("ignores a custom tool somebody added in Retell that we do not know", () => {
    // Editing an agent must not silently drop or claim a tool built elsewhere.
    const parsed = parseAgentTools([{ type: "custom", name: "their_own_tool" }]);
    expect(parsed.live).toEqual([]);
  });

  it("copes with an agent that has no tools at all", () => {
    expect(parseAgentTools(undefined).live).toEqual([]);
  });

  it("every ability offered can be read back after being written", () => {
    const all = LIVE_TOOLS.map((t) => t.id);
    expect(parseAgentTools(buildAgentTools({ live: all })).live).toEqual(all);
  });
});
