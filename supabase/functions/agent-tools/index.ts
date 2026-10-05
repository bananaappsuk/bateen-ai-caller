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

// A withheld caller does not arrive as an empty string. Twilio sends its
// anonymous sentinel +266696687 ("anonymous" on a keypad) and carriers vary
// with "anonymous", "unavailable", "private" or "restricted". Treated as a
// real number, each of those becomes a shared fake customer that every
// withheld caller reads and writes, so they are rejected up front.
const WITHHELD = new Set(["anonymous", "unavailable", "private", "restricted", "unknown", "+266696687", "266696687"]);
const usableNumber = (n: string | undefined): string | null => {
  const v = (n ?? "").trim();
  if (!v || WITHHELD.has(v.toLowerCase())) return null;
  // Anything that is not a plausible E.164 number is not something to key on.
  return /^\+?[0-9]{7,15}$/.test(v.replace(/[\s()-]/g, "")) ? v : null;
};

/** Keeps the latest message first without throwing away what came before. */
const appendSummary = (previous: string | null | undefined, next: string): string => {
  const prior = (previous ?? "").trim();
  if (!prior) return next;
  if (prior.startsWith(next)) return prior;
  return `${next}\n\nEarlier: ${prior}`.slice(0, 2000);
};

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
    const fromNumber = usableNumber((call.from_number ?? args.from_number) as string | undefined);

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
        if (!fromNumber) {
          // Withheld or missing: say so rather than claiming they are new,
          // which would make a regular caller feel like a stranger.
          return say(
            "Your number is not showing, so I can't look you up. I can still help — I'll just need to ask you a couple of things.",
            { known: false, number_withheld: true },
          );
        }
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
        const phone = fromNumber ?? usableNumber(args.phone as string | undefined);
        if (!phone) {
          return say("I can't see the number you're ringing from — what's the best number to reach you on?", {
            needs_number: true,
          });
        }

        const { data: existing } = await supabase
          .from("leads").select("id, name, summary")
          .eq("user_id", userId).eq("phone", phone).maybeSingle();
        if (existing?.id) {
          // Only overwrite a name when a new one was actually given: a caller
          // who rings back without restating theirs used to have it erased.
          await supabase.from("leads").update({
            ...(name ? { name } : {}),
            summary: appendSummary(existing.summary as string | null, message),
            lead_status: "Requested Callback" as const,
          }).eq("id", existing.id);
        } else {
          await supabase.from("leads").insert({
            user_id: userId, phone, campaign_id: null,
            name, summary: message, lead_status: "Requested Callback" as const,
          });
        }
        return say("I've taken that down and passed it on. Someone will come back to you.", { saved: true });
      }

      // ---- ask for a callback --------------------------------------------
      case "book_callback": {
        const when = String(args.when ?? "").trim();
        const phone = fromNumber ?? usableNumber(args.phone as string | undefined);
        if (!phone) {
          return say("I can't see the number you're ringing from — what's the best number to call you back on?", {
            needs_number: true,
          });
        }
        const callerName = (args.name as string | undefined)?.trim() || null;
        const note = when ? `Callback requested for ${when}.` : "Callback requested.";

        const { data: existing } = await supabase
          .from("leads").select("id, name, summary")
          .eq("user_id", userId).eq("phone", phone).maybeSingle();
        if (existing?.id) {
          await supabase.from("leads").update({
            ...(callerName ? { name: callerName } : {}),
            lead_status: "Requested Callback",
            summary: appendSummary(existing.summary as string | null, note),
          }).eq("id", existing.id);
        } else {
          await supabase.from("leads").insert({
            user_id: userId, phone, campaign_id: null, name: callerName,
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
