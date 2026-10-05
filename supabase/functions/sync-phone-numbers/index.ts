// Refreshes the numbers a tenant can point an agent at.
//
// Two sources, and the difference between them is the whole point:
//   - Retell knows every number registered with it. Necessary, not sufficient.
//   - Twilio knows which numbers are ON the SIP trunk. That is what actually
//     decides whether a call ever reaches us. +447576545787 sat in Retell for
//     weeks and still rejected calls until it was added to the trunk.
//
// So Retell gives the candidate list and Twilio, when configured, marks each
// one reachable or not. Without Twilio credentials we still sync, but leave
// on_trunk NULL rather than claiming a number works when we cannot know.
//
// Retell is one shared platform account, so its list contains every tenant's
// numbers. A number already owned by someone else is skipped, never reassigned
// — otherwise whoever pressed Sync last would take over the platform.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface RetellPhoneNumber {
  phone_number?: string;
  phone_number_pretty?: string;
}

/** Numbers Twilio reports as attached to the trunk, in E.164. */
async function trunkNumbers(): Promise<Set<string> | null> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const trunk = Deno.env.get("TWILIO_TRUNK_SID");
  if (!sid || !token || !trunk) return null; // not configured — say nothing

  const res = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunk}/PhoneNumbers?PageSize=200`, {
    headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
  });
  if (!res.ok) {
    console.error(`[sync-phone-numbers] Twilio trunk read failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const body = (await res.json()) as { phone_numbers?: Array<{ phone_number?: string }> };
  return new Set((body.phone_numbers ?? []).map((n) => n.phone_number).filter(Boolean) as string[]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("RETELL_API_KEY");
    if (!apiKey) return json({ error: "RETELL_API_KEY is not configured on the server." }, 500);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized." }, 401);

    const retellRes = await fetch("https://api.retellai.com/v2/list-phone-numbers", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!retellRes.ok) {
      return json({ error: `Could not read your numbers from Retell (${retellRes.status}).` }, 502);
    }
    const payload = (await retellRes.json()) as { items?: RetellPhoneNumber[] } | RetellPhoneNumber[];
    const items = Array.isArray(payload) ? payload : (payload.items ?? []);
    const numbers = [...new Set(items.map((i) => i.phone_number).filter(Boolean) as string[])];

    const onTrunk = await trunkNumbers();
    const trunkVerified = onTrunk !== null;
    const checkedAt = new Date().toISOString();

    // Who already owns what. Rows belonging to another tenant are left alone.
    const { data: existing } = await supabase
      .from("phone_numbers")
      .select("id, twilio_phone_number, user_id")
      .in("twilio_phone_number", numbers.length ? numbers : ["__none__"]);
    const owner = new Map((existing ?? []).map((r) => [r.twilio_phone_number as string, r]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const number of numbers) {
      const row = owner.get(number);
      const trunkPatch = trunkVerified
        ? { on_trunk: onTrunk!.has(number), trunk_checked_at: checkedAt }
        : {};

      if (!row) {
        const { error } = await supabase.from("phone_numbers").insert({
          user_id: userId,
          twilio_phone_number: number,
          retell_phone_number_id: number,
          status: "active",
          ...trunkPatch,
        });
        if (!error) added++;
        continue;
      }
      if (row.user_id !== userId) {
        skipped++; // another tenant's number
        continue;
      }
      if (trunkVerified) {
        const { error } = await supabase.from("phone_numbers").update(trunkPatch).eq("id", row.id);
        if (!error) updated++;
      }
    }

    return json({
      added,
      updated,
      skipped,
      total: numbers.length,
      trunkVerified,
      // The browser words the result; it needs to know whether "reachable" is
      // something we actually checked or merely did not contradict.
      message: trunkVerified
        ? `${numbers.length} number${numbers.length === 1 ? "" : "s"} checked against the Twilio trunk.`
        : `${numbers.length} number${numbers.length === 1 ? "" : "s"} synced from Retell. Twilio is not configured, so we could not confirm which are on the trunk.`,
    });
  } catch (e) {
    console.error("[sync-phone-numbers]", e);
    return json({ error: e instanceof Error ? e.message : "Sync failed." }, 500);
  }
});
