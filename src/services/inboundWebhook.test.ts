import { describe, it, expect } from "vitest";

// The inbound branch of retell-webhook decides, for every event Retell sends,
// whether a call belongs to a tenant and what to write. Getting this wrong
// either drops a caller's enquiry or writes it to the wrong account, so the
// decisions are pinned here. Mirrors supabase/functions/retell-webhook.

type Meta = Record<string, unknown>;

/** True only when inbound-call stamped this call for a known tenant. */
const inboundUserId = (metadata: Meta): string | undefined =>
  metadata.direction === "inbound" ? (metadata.userId as string | undefined) : undefined;

const durationMs = (start?: number, end?: number) =>
  start && end && end > start ? end - start : null;

const leadStatusFor = (event: string) => (event === "call_started" ? "calling" : "completed");

describe("inbound call attribution", () => {
  it("claims a call stamped by inbound-call", () => {
    expect(inboundUserId({ direction: "inbound", userId: "u1" })).toBe("u1");
  });

  it("ignores outbound calls entirely, so the existing dialer path is untouched", () => {
    // An outbound call carries leadId/campaignId and no direction — it must
    // fall through to the outbound handler, not be rewritten as an enquiry.
    expect(inboundUserId({ leadId: "l1", campaignId: "c1" })).toBeUndefined();
  });

  it("ignores a call marked inbound but with no tenant", () => {
    // Happens when a number isn't registered: we pass the call through rather
    // than inventing an owner for it.
    expect(inboundUserId({ direction: "inbound" })).toBeUndefined();
  });

  it("does not claim a call just because a userId is present", () => {
    expect(inboundUserId({ userId: "u1" })).toBeUndefined();
  });
});

describe("inbound call duration", () => {
  it("computes a real duration", () => {
    expect(durationMs(1_000_000_000, 1_000_090_000)).toBe(90_000);
  });
  it("is null while the call is still ringing", () => {
    expect(durationMs(1_000_000_000, undefined)).toBeNull();
  });
  it("refuses a negative duration from out-of-order timestamps", () => {
    expect(durationMs(1_000_090_000, 1_000_000_000)).toBeNull();
  });
});

describe("enquiry lifecycle", () => {
  it("marks the lead as calling while the call is live", () => {
    expect(leadStatusFor("call_started")).toBe("calling");
  });
  it("completes the lead once the call ends or is analyzed", () => {
    expect(leadStatusFor("call_ended")).toBe("completed");
    expect(leadStatusFor("call_analyzed")).toBe("completed");
  });
});

describe("enquiries are leads without a campaign", () => {
  const isEnquiry = (lead: { campaign_id: string | null }) => lead.campaign_id === null;

  it("an inbound caller has no campaign", () => {
    expect(isEnquiry({ campaign_id: null })).toBe(true);
  });
  it("a dialled lead always belongs to one", () => {
    expect(isEnquiry({ campaign_id: "c1" })).toBe(false);
  });
});

// Retell identifies the answering agent only by its own id, so the webhook
// looks the name up in our agents table. Without that, every inbound call
// showed "—" in the Agent column while outbound calls showed a name, because
// the browser fills agent_name for outbound and nothing filled it for inbound.
const agents = [{ retell_agent_id: "agent_d75", user_id: "u1", name: "IT Talent Hub Reception" }];

/** Mirrors the lookup in the webhook: scoped by tenant as well as agent id. */
const resolveAgentName = (retellAgentId: string | null, userId: string): string | null =>
  agents.find((a) => a.retell_agent_id === retellAgentId && a.user_id === userId)?.name ?? null;

/** Mirrors the spread that keeps agent_name out of the row when unresolved. */
const agentNamePatch = (name: string | null) => (name ? { agent_name: name } : {});

describe("the answering agent's name reaches the call log", () => {
  it("resolves the name from the Retell agent id", () => {
    expect(resolveAgentName("agent_d75", "u1")).toBe("IT Talent Hub Reception");
  });

  it("writes it onto the call row", () => {
    expect(agentNamePatch(resolveAgentName("agent_d75", "u1"))).toEqual({
      agent_name: "IT Talent Hub Reception",
    });
  });

  it("will not read another tenant's agent name", () => {
    // The lookup is scoped by user_id as well, so a shared Retell account
    // cannot leak one customer's agent name into another's call log.
    expect(resolveAgentName("agent_d75", "u2")).toBeNull();
  });

  it("omits the field rather than blanking a stored name when it cannot resolve", () => {
    // call_started, call_ended and call_analyzed all write this row. If a later
    // event resolved nothing and still set agent_name, it would wipe the name an
    // earlier event had already stored.
    expect(agentNamePatch(resolveAgentName("agent_unknown", "u1"))).toEqual({});
  });

  it("handles a call with no agent id at all", () => {
    expect(resolveAgentName(null, "u1")).toBeNull();
    expect(agentNamePatch(null)).toEqual({});
  });
});
