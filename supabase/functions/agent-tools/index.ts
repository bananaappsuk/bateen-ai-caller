// The things a voice agent can actually DO mid-call.
//
// Until now an agent could only hang up or transfer, which is why ours sounded
// scripted next to a chat agent that can look things up and act. Retell calls
// this endpoint while the caller is still on the line, waits for the answer,
// and speaks it. So every reply here is written to be read aloud: a short
// `say` string, never JSON jargon, never a stack trace.
//
// Tenancy: Retell is one shared account, so the tenant is resolved from the
// live call rather than trusted from the request. `call_id` is matched against
// the call row the retell-webhook wrote; only if that is not there yet (the
// tool can fire before call_started lands) do we fall back to the agent id in
// the URL. A tool never reads or writes outside the tenant it resolved.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Everything the model is told went wrong still has to be sayable. */
const say = (text: string, extra: Record<string, unknown> = {}) => json({ say: text, ...extra });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

type Supa = ReturnType<typeof admin>;

async function resolveTenant(
  supabase: Supa,
  callId: string | undefined,
  agentId: string | null,
): Promise<string | null> {
  if (callId) {
    const { data } = await supabase
      .from("calls")
      .select("user_id")
      .eq("retell_call_id", callId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  if (agentId) {
    const { data } = await supabase
      .from("agents")
      .select("user_id")
      .eq("retell_agent_id", agentId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  return null;
}

/** Last four digits, so a log line never carries a whole phone number. */
const tail = (n: string | undefined) => (n ? `…${n.slice(-4)}` : "unknown");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agent");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Retell posts { name, args, call: { call_id, ... } } for a custom tool,
    // but older shapes put the arguments at the top level, so accept both.
    const args = (body.args ?? body.arguments ?? body) as Record<string, unknown>;
    const call = (body.call ?? {}) as Record<string, unknown>;
    const toolName = String(body.name ?? url.searchParams.get("tool") ?? "");
    const callId = (call.call_id ?? args.call_id) as string | undefined;
    const fromNumber = ((call.from_number ?? args.from_number) as string | undefined)?.trim();

    const supabase = admin();
    const userId = await resolveTenant(supabase, callId, agentId);
    if (!userId) {
      console.error(`[agent-tools] ${toolName}: no tenant for call=${callId} agent=${agentId}`);
      return say("I can't reach our system for that right now.");
    }
    console.log(`[agent-tools] ${toolName} user=${userId} from=${tail(fromNumber)}`);

    switch (toolName) {
      // ---- who is ringing, and have we spoken before? --------------------
      case "look_up_caller": {
        if (!fromNumber) return say("I don't have your number showing, so I can't look you up.");
        const { data } = await supabase
          .from("leads")
          .select("name, lead_status, summary, created_at")
          .eq("user_id", userId)
          .eq("phone", fromNumber)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data) return say("I can't see a previous conversation with this number.", { known: false });
        const name = (data.name as string | null) ?? null;
        const last = ((data.summary as string | null) ?? "no notes were kept").trim().replace(/\.+$/, "");
        return say(
          name
            ? `This is ${name}. Last time: ${last}.`
            : `We have spoken before. Last time: ${last}.`,
          { known: true, name, last_status: data.lead_status },
        );
      }

      // ---- take a message ------------------------------------------------
      case "take_message": {
        const message = String(args.message ?? "").trim();
        if (!message) return say("I didn't catch the message — could you say it again?");
        const name = (args.name as string | undefined)?.trim() || null;
        const phone = fromNumber ?? (args.phone as string | undefined) ?? null;
        if (!phone) return say("I need a number to put the message against.");

        const { data: existing } = await supabase
          .from("leads").select("id").eq("user_id", userId).eq("phone", phone).maybeSingle();
        const patch = {
          name, summary: message, lead_status: "Requested Callback" as const,
        };
        if (existing?.id) {
          await supabase.from("leads").update(patch).eq("id", existing.id);
        } else {
          await supabase.from("leads").insert({ user_id: userId, phone, campaign_id: null, ...patch });
        }
        return say("I've taken that down and passed it on. Someone will come back to you.", { saved: true });
      }

      // ---- ask for a callback --------------------------------------------
      case "book_callback": {
        const when = String(args.when ?? "").trim();
        const phone = fromNumber ?? (args.phone as string | undefined) ?? null;
        if (!phone) return say("I need a number to call you back on.");
        const note = when ? `Callback requested for ${when}.` : "Callback requested.";

        const { data: existing } = await supabase
          .from("leads").select("id, summary").eq("user_id", userId).eq("phone", phone).maybeSingle();
        if (existing?.id) {
          await supabase.from("leads").update({
            lead_status: "Requested Callback",
            summary: [existing.summary, note].filter(Boolean).join(" "),
          }).eq("id", existing.id);
        } else {
          await supabase.from("leads").insert({
            user_id: userId, phone, campaign_id: null,
            name: (args.name as string | undefined) ?? null,
            lead_status: "Requested Callback", summary: note,
          });
        }
        return say(
          when ? `That's booked in for ${when}. We'll ring you then.` : "That's booked in, we'll ring you back.",
          { saved: true },
        );
      }

      default:
        console.error(`[agent-tools] unknown tool ${toolName}`);
        return say("I can't do that one, but I can take a message if that helps.");
    }
  } catch (e) {
    console.error("[agent-tools]", e);
    // Never surface an error to a caller mid-sentence.
    return say("Sorry, something went wrong at our end just then.");
  }
});
