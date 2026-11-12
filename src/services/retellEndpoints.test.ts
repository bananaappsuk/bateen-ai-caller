import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const service = readFileSync(join(process.cwd(), "src/services/retellService.ts"), "utf8");
const proxy = readFileSync(join(process.cwd(), "supabase/functions/retell/index.ts"), "utf8");

const v2Forced = (() => {
  const block = proxy.match(/const V2_ENDPOINTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();

describe("Retell endpoint versions", () => {
  it("create-web-call targets v3", () => {
    expect(service).toContain('path: "/v3/create-web-call"');
  });

  // Retell removed /v2/create-web-call on 18 Oct 2026; the proxy prefixing it
  // back to v2 is what broke the agent test call.
  it("the proxy does not force create-web-call back to v2", () => {
    expect(v2Forced).not.toContain("/create-web-call");
  });

  it("list-calls stays on v3", () => {
    expect(service).toContain('path: "/v3/list-calls"');
  });

  it("list-agents is POST, which is all v2 accepts", () => {
    const block = service.match(/export async function listAgents[\s\S]*?\n}/)?.[0] ?? "";
    expect(block).toContain('method: "POST"');
  });

  it("no unversioned call endpoint is left for the proxy to guess at", () => {
    for (const path of ["/create-web-call", "/v2/create-web-call"]) {
      expect(service).not.toContain(`path: "${path}"`);
    }
  });
});

describe("browser SDK", () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  const page = readFileSync(join(process.cwd(), "src/pages/AIAgentsPage.tsx"), "utf8");

  it("is on 3.x — 2.x was cut off on 18 Oct 2026", () => {
    expect(pkg.dependencies["retell-client-js-sdk"]).toMatch(/^\^?3\./);
  });

  // startCall needs all four fields the v3 response returns; passing only
  // accessToken leaves the SDK guessing at transport and ICE servers.
  it.each(["accessToken", "callId", "transport", "iceServers"])(
    "the test call passes %s to the SDK",
    (field) => {
      const block = page.match(/await client\.startCall\(\{[\s\S]*?\}\);/)?.[0] ?? "";
      expect(block).toContain(field);
    },
  );
});
