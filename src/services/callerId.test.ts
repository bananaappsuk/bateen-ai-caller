import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fx from "@/test/fixtures";

// Every campaign dialled from one hardcoded number, which is now the AI Agent
// Hub inbound line. A second client's leads would have seen that number and
// reached the wrong business on a call back.

let inboundRows: Array<{ phone_number: string }> = [];
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) chain[m] = () => chain;
  chain.limit = async () => ({ data: inboundRows, error: null });
  return { supabase: { from: () => chain, auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } } };
});

beforeEach(() => { inboundRows = []; });

describe("which number a client dials from", () => {
  it("uses the agent's own inbound line when it has one", async () => {
    inboundRows = [{ phone_number: "+447915903057" }];
    const { callerIdForAgent } = await import("./inboundService");
    expect(await callerIdForAgent("agent-row-1")).toBe("+447915903057");
  });

  it("returns nothing when the agent has no number, so the caller falls back", async () => {
    inboundRows = [];
    const { callerIdForAgent } = await import("./inboundService");
    expect(await callerIdForAgent("agent-row-1")).toBeNull();
  });

  it("the fallback is the platform number, never undefined", async () => {
    const { PLATFORM_TWILIO_NUMBER } = await import("@/lib/platformConfig");
    const { callerIdForAgent } = await import("./inboundService");
    const resolved = (await callerIdForAgent("nobody")) ?? PLATFORM_TWILIO_NUMBER;
    expect(resolved).toMatch(/^\+44\d+$/);
  });

  it("two agents on different lines get different caller ids", async () => {
    const { callerIdForAgent } = await import("./inboundService");
    inboundRows = [{ phone_number: "+447576545787" }];
    const a = await callerIdForAgent("agent-a");
    inboundRows = [{ phone_number: "+447915903057" }];
    const b = await callerIdForAgent("agent-b");
    expect(a).not.toBe(b);
  });
});
