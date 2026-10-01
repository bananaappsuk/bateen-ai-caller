// Retell inbound-call webhook: decides which agent answers an incoming call.
//
// Retell POSTs this the moment a call arrives, before anything is answered:
//   { event: "call_inbound", call_inbound: { call_id, agent_id, from_number, to_number } }
// and expects, within its timeout:
//   { call_inbound: { override_agent_id?, dynamic_variables?, metadata?, reject? } }
//
// All tenants share one Retell account, so the dialled number is what tells us
// whose call this is. We look it up in inbound_numbers, answer with that
// tenant's agent, and stamp the tenant on the call's metadata so retell-webhook
// can attribute the transcript and the lead when the call ends.
//
// Deployed with --no-verify-jwt: Retell calls it directly, not a signed-in user.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Any failure here means a real caller hears nothing, so every path returns a
  // 200 with an empty directive: Retell then falls back to whatever agent is
  // bound to the number rather than dropping the call.
  const passThrough = () => json({ call_inbound: {} });

  try {
    const payload = await req.json().catch(() => null);
    const inbound = payload?.call_inbound;
    if (!inbound) return passThrough();

    const toNumber = String(inbound.to_number ?? "");
    const fromNumber = String(inbound.from_number ?? "");
    if (!toNumber) return passThrough();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: number } = await supabase
      .from("inbound_numbers")
      .select("id, user_id, label, agent:agents(id, retell_agent_id, name)")
      .eq("phone_number", toNumber)
      .maybeSingle();

    // Not one of ours (e.g. the landing-page demo line) — leave it alone.
    if (!number) {
      console.log(`[inbound-call] unregistered number ${toNumber}, passing through`);
      return passThrough();
    }

    const agent = number.agent as { id?: string; retell_agent_id?: string; name?: string } | null;
    if (!agent?.retell_agent_id) {
      // The number is ours but nobody is assigned to answer it. Pass through so
      // the caller still reaches Retell's bound agent instead of dead air.
      console.warn(`[inbound-call] ${toNumber} has no agent assigned`);
      return passThrough();
    }

    return json({
      call_inbound: {
        override_agent_id: agent.retell_agent_id,
        // Carried back to us on every later webhook for this call, which is how
        // an inbound call gets attributed to the right tenant.
        metadata: {
          userId: number.user_id,
          inboundNumberId: number.id,
          agentRowId: agent.id,
          direction: "inbound",
        },
        dynamic_variables: {
          caller_number: fromNumber,
          line_name: number.label ?? "",
        },
      },
    });
  } catch (e) {
    console.error("[inbound-call] threw", e);
    return passThrough();
  }
});
