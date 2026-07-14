// Admin API (VocalMax getAdminOverview / getAdminTrends / deleteUser / disableUser
// / enableUser). Verifies the caller is an admin (user_metadata.role === "admin"),
// then runs the requested action with the service role. All mutations are audited.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

async function audit(supabase: SupabaseClient, actorId: string, action: string, target?: string) {
  await supabase.from("audit_log").insert({ actor_id: actorId, action, target });
}

const RETELL_BASE = "https://api.retellai.com";
async function retell(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const r = await fetch(RETELL_BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get("RETELL_API_KEY")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let d: unknown;
  try {
    d = JSON.parse(t);
  } catch {
    d = t;
  }
  if (!r.ok) {
    throw new Error(typeof d === "object" && d ? ((d as { error?: string }).error ?? JSON.stringify(d)) : String(d));
  }
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized." }, 401);
    const supabase = admin();
    const { data: caller } = await supabase.auth.getUser(token);
    if (!caller.user) return json({ error: "Unauthorized." }, 401);
    if ((caller.user.user_metadata as Record<string, unknown>)?.role !== "admin") {
      return json({ error: "Forbidden — admin only." }, 403);
    }
    const actorId = caller.user.id;
    const { action, payload } = await req.json();

    switch (action) {
      case "overview": {
        const [users, campaigns, leads, calls, agents, accounts] = await Promise.all([
          supabase.auth.admin.listUsers(),
          supabase.from("campaigns").select("campaign_id", { count: "exact", head: true }),
          supabase.from("leads").select("id", { count: "exact", head: true }),
          supabase.from("calls").select("id", { count: "exact", head: true }),
          supabase.from("agents").select("id", { count: "exact", head: true }),
          supabase.from("billing_accounts").select("plan_tier,subscription_status,credits"),
        ]);
        const byTier: Record<string, number> = {};
        for (const a of accounts.data ?? []) {
          if (a.subscription_status === "active" || a.subscription_status === "trialing") {
            const t = a.plan_tier ?? "none";
            byTier[t] = (byTier[t] ?? 0) + 1;
          }
        }
        return json({
          totalUsers: users.data.users.length,
          campaigns: campaigns.count ?? 0,
          leads: leads.count ?? 0,
          calls: calls.count ?? 0,
          agents: agents.count ?? 0,
          subscriptionsByTier: byTier,
          totalCredits: (accounts.data ?? []).reduce((s, a) => s + (a.credits ?? 0), 0),
        });
      }
      case "trends": {
        const days = 14;
        const since = new Date(Date.now() - days * 864e5).toISOString();
        const { data } = await supabase.from("calls").select("created_at").gte("created_at", since);
        const buckets: Record<string, number> = {};
        for (const c of data ?? []) {
          const d = (c.created_at as string).slice(0, 10);
          buckets[d] = (buckets[d] ?? 0) + 1;
        }
        return json({ callsByDay: buckets });
      }
      case "listUsers": {
        const { data } = await supabase.auth.admin.listUsers();
        return json({
          users: data.users.map((u) => ({
            id: u.id,
            email: u.email,
            name: (u.user_metadata as Record<string, unknown>)?.name ?? null,
            role: (u.user_metadata as Record<string, unknown>)?.role ?? "user",
            banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
            created_at: u.created_at,
          })),
        });
      }
      case "disableUser":
        await supabase.auth.admin.updateUserById(payload.id, { ban_duration: "876000h" });
        await audit(supabase, actorId, "disableUser", payload.id);
        return json({ ok: true });
      case "enableUser":
        await supabase.auth.admin.updateUserById(payload.id, { ban_duration: "none" });
        await audit(supabase, actorId, "enableUser", payload.id);
        return json({ ok: true });
      case "deleteUser":
        await supabase.auth.admin.deleteUser(payload.id);
        await audit(supabase, actorId, "deleteUser", payload.id);
        return json({ ok: true });
      case "impersonate": {
        const { data: u } = await supabase.auth.admin.getUserById(payload.id);
        if (!u.user?.email) return json({ error: "User has no email." }, 400);
        const { data: link, error } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: u.user.email,
        });
        if (error) throw error;
        await audit(supabase, actorId, "impersonate", payload.id);
        return json({ link: link.properties?.action_link });
      }
      case "syncNumbers": {
        const res = (await retell("/v2/list-phone-numbers")) as { items?: unknown[] } | unknown[];
        const items = (Array.isArray(res) ? res : (res.items ?? [])) as Record<string, unknown>[];
        for (const n of items) {
          const num = n.phone_number as string;
          await supabase.from("phone_numbers").upsert(
            {
              retell_phone_number_id: num,
              phone_number: num,
              friendly_name: (n.nickname as string) || null,
              assigned_agent_id:
                (n.outbound_agents as { agent_id: string }[])?.[0]?.agent_id ||
                (n.inbound_agents as { agent_id: string }[])?.[0]?.agent_id ||
                null,
              status: "active",
              user_id: actorId,
            },
            { onConflict: "retell_phone_number_id" },
          );
        }
        await audit(supabase, actorId, "syncNumbers", String(items.length));
        return json({ synced: items.length });
      }
      case "buyNumber": {
        const num = (await retell(
          "/create-phone-number",
          "POST",
          payload?.areaCode ? { area_code: Number(payload.areaCode) } : {},
        )) as { phone_number?: string };
        await audit(supabase, actorId, "buyNumber", num.phone_number ?? "");
        return json({ number: num.phone_number });
      }
      case "removeNumber": {
        await retell(`/delete-phone-number/${encodeURIComponent(payload.phone)}`, "DELETE").catch(() => undefined);
        await supabase.from("phone_numbers").delete().eq("retell_phone_number_id", payload.phone);
        await audit(supabase, actorId, "removeNumber", payload.phone);
        return json({ ok: true });
      }
      case "endTrial": {
        const target = payload?.id || actorId;
        const { data: acct } = await supabase.from("billing_accounts").select("*").eq("user_id", target).maybeSingle();
        if (!acct?.stripe_subscription_id) return json({ error: "No subscription on trial." }, 400);
        const s = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
        await s.subscriptions.update(acct.stripe_subscription_id, { trial_end: "now" });
        await audit(supabase, actorId, "endTrial", target);
        return json({ ok: true });
      }
      case "seedDemo": {
        const { data: agent } = await supabase
          .from("agents")
          .insert({ user_id: actorId, name: "Demo Agent", status: "active", retell_voice_id: "11labs-Adrian" })
          .select()
          .single();
        const { data: camp } = await supabase
          .from("campaigns")
          .insert({
            user_id: actorId,
            name: "Demo Campaign",
            status: "draft",
            agent_id: agent?.id ?? null,
            total_leads: 3,
            concurrency: 5,
            max_attempts: 3,
            retry_delay_minutes: 60,
          })
          .select()
          .single();
        const demoLeads = [
          ["Jane Doe", "+14155550101"],
          ["John Smith", "+14155550102"],
          ["Sam Patel", "+14155550103"],
        ].map(([name, phone]) => ({ user_id: actorId, campaign_id: camp!.campaign_id, name, phone, status: "pending" }));
        await supabase.from("leads").insert(demoLeads);
        await audit(supabase, actorId, "seedDemo", camp!.campaign_id);
        return json({ ok: true, campaignId: camp!.campaign_id });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
