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

// Deletes every row in `table` matching `column = value` and returns how many
// were removed, for the deleteUser cascade's per-table summary.
async function deleteRows(supabase: SupabaseClient, table: string, column: string, value: string): Promise<number> {
  const { data, error } = await supabase.from(table).delete().eq(column, value).select("id");
  if (error) throw error;
  return data?.length ?? 0;
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
      case "deleteUser": {
        const targetId = payload?.id as string;
        if (!targetId) return json({ error: "id is required." }, 400);

        // Full cascade before removing the auth user itself — only
        // phone_numbers has a real ON DELETE CASCADE FK back to auth.users
        // today, so every other user-owned table is cleaned up explicitly
        // here rather than being left as orphaned rows under a now-deleted
        // user_id. Order mostly doesn't matter (each delete is scoped to
        // this one user_id, not relying on a parent still existing), except
        // consent_log/calls/leads are done first purely so their row counts
        // are still accurate before campaigns cascades anything itself.
        const deleted: Record<string, number> = {
          consent_log: await deleteRows(supabase, "consent_log", "user_id", targetId),
          calls: await deleteRows(supabase, "calls", "user_id", targetId),
          leads: await deleteRows(supabase, "leads", "user_id", targetId),
          campaigns: await deleteRows(supabase, "campaigns", "user_id", targetId),
          phone_numbers: await deleteRows(supabase, "phone_numbers", "user_id", targetId),
          agents: await deleteRows(supabase, "agents", "user_id", targetId),
          credit_transactions: await deleteRows(supabase, "credit_transactions", "user_id", targetId),
          credit_orders: await deleteRows(supabase, "credit_orders", "user_id", targetId),
          billing_accounts: await deleteRows(supabase, "billing_accounts", "user_id", targetId),
          notification_settings: await deleteRows(supabase, "notification_settings", "user_id", targetId),
          tenant_members: await deleteRows(supabase, "tenant_members", "user_id", targetId),
          tenants: await deleteRows(supabase, "tenants", "owner_id", targetId),
        };

        await supabase.auth.admin.deleteUser(targetId);
        await audit(supabase, actorId, "deleteUser", `${targetId} :: ${JSON.stringify(deleted)}`);
        return json({ ok: true, deleted });
      }
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
        // Admin-only oversight count of Retell's whole inventory — this used
        // to also shadow-copy every number into phone_numbers stamped as
        // owned by whichever admin clicked the button, which both served no
        // real read path (AdminPage's own number list comes straight from
        // this same Retell call) and actively conflicted with phone_numbers
        // now being a strictly tenant-owned table (one real owner per
        // number, enforced by a UNIQUE constraint). Numbers only enter that
        // table through a tenant's own add-phone-number call.
        const res = (await retell("/v2/list-phone-numbers")) as { items?: unknown[] } | unknown[];
        const items = (Array.isArray(res) ? res : (res.items ?? [])) as Record<string, unknown>[];
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
        const { data: owned } = await supabase
          .from("phone_numbers")
          .select("linked_agent_id")
          .eq("retell_phone_number_id", payload.phone)
          .maybeSingle();
        await retell(`/delete-phone-number/${encodeURIComponent(payload.phone)}`, "DELETE").catch(() => undefined);
        if (owned?.linked_agent_id) {
          await supabase.from("agents").update({ phone_number: null }).eq("id", owned.linked_agent_id);
        }
        await supabase.from("phone_numbers").delete().eq("retell_phone_number_id", payload.phone);
        await audit(supabase, actorId, "removeNumber", payload.phone);
        return json({ ok: true });
      }
      case "getDemoConfig": {
        const { data } = await supabase.from("demo_call_config").select("*").eq("id", true).maybeSingle();
        return json({ config: data ?? null });
      }
      case "setDemoConfig": {
        const { agentId, agentName, phoneNumber } = payload ?? {};
        if (!agentId || !phoneNumber) return json({ error: "agentId and phoneNumber are required." }, 400);

        // Add (don't replace) this agent onto the chosen number's Retell binding,
        // so a number already serving a production agent keeps that agent too.
        const [numbersRes, agentInfo] = await Promise.all([
          retell("/v2/list-phone-numbers") as Promise<{ items?: unknown[] } | unknown[]>,
          retell(`/get-agent/${encodeURIComponent(agentId)}`) as Promise<{ version?: number }>,
        ]);
        const numbers = (Array.isArray(numbersRes) ? numbersRes : (numbersRes.items ?? [])) as Record<string, unknown>[];
        const target = numbers.find((n) => n.phone_number === phoneNumber);
        // Retell requires each direction's agent weights to sum to exactly 1 —
        // split evenly across however many agents now share this number.
        const mergeAgent = (list: unknown) => {
          const ids = [
            ...((list as { agent_id: string; agent_version?: number }[] | undefined) ?? [])
              .filter((a) => a.agent_id !== agentId)
              .map((a) => ({ agent_id: a.agent_id, agent_version: a.agent_version })),
            { agent_id: agentId, agent_version: agentInfo.version ?? 0 },
          ];
          const base = Math.floor((1 / ids.length) * 1e6) / 1e6;
          return ids.map((a, i) => ({ ...a, weight: i === ids.length - 1 ? 1 - base * (ids.length - 1) : base }));
        };
        await retell(`/update-phone-number/${encodeURIComponent(phoneNumber)}`, "PATCH", {
          inbound_agents: mergeAgent(target?.inbound_agents),
          outbound_agents: mergeAgent(target?.outbound_agents),
        });

        const { data } = await supabase
          .from("demo_call_config")
          .upsert({ id: true, agent_id: agentId, agent_name: agentName ?? null, phone_number: phoneNumber, updated_by: actorId })
          .select()
          .single();
        await audit(supabase, actorId, "setDemoConfig", `${agentId} -> ${phoneNumber}`);
        return json({ config: data });
      }
      case "adjustCredits": {
        const { delta, reason, userId: targetUserId } = payload ?? {};
        const deltaNum = Number(delta);
        if (!deltaNum) return json({ error: "delta is required." }, 400);
        const target = targetUserId || actorId;

        let { data: acct } = await supabase.from("billing_accounts").select("*").eq("user_id", target).maybeSingle();
        if (!acct) {
          const { data: created } = await supabase
            .from("billing_accounts")
            .insert({ user_id: target, credits: 0 })
            .select()
            .single();
          acct = created;
        }
        if (!acct) return json({ error: "Could not resolve billing account." }, 500);

        const newCredits = Math.max(0, (acct.credits ?? 0) + deltaNum);
        await supabase.from("billing_accounts").update({ credits: newCredits }).eq("id", acct.id);
        await supabase.from("credit_transactions").insert({
          user_id: target,
          type: "adjustment",
          credits: deltaNum,
          description: (reason ?? "").trim() || `Admin adjustment ${deltaNum > 0 ? "+" : ""}${deltaNum}`,
        });
        await audit(supabase, actorId, "adjustCredits", `${target}: ${deltaNum}`);
        return json({ credits: newCredits });
      }
      case "endTrial": {
        const target = payload?.id || actorId;
        const { data: acct } = await supabase.from("billing_accounts").select("*").eq("user_id", target).maybeSingle();
        if (!acct?.stripe_subscription_id) return json({ error: "No subscription on trial." }, 400);
        const s = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
        try {
          await s.subscriptions.update(acct.stripe_subscription_id, { trial_end: "now" });
        } catch (e) {
          // Stale id from before a test→live key switch (or deleted in Stripe).
          if ((e as { code?: string })?.code === "resource_missing") {
            return json({ error: "No subscription on trial." }, 400);
          }
          throw e;
        }
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
