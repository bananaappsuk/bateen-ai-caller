// Knowledge base management, proxied to Retell and recorded per tenant.
//
// Can't go through the shared `retell` proxy: that proxy is JSON-only and
// creating a knowledge base is multipart/form-data with file uploads.
//
// Verified against the live Retell API (2026-10-01):
//   POST   /create-knowledge-base              multipart -> 201 { knowledge_base_id, status, ... }
//   POST   /add-knowledge-base-sources/{id}    multipart -> 200 KnowledgeBaseResponse
//   GET    /get-knowledge-base/{id}            -> { status, knowledge_base_sources[] }
//   DELETE /delete-knowledge-base/{id}         -> 204          (no /v2 prefix on any of these)
// Fields: knowledge_base_name, knowledge_base_texts (JSON [{title,text}]),
//         knowledge_base_urls (JSON [url]), knowledge_base_files (binary),
//         enable_auto_refresh.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RETELL = "https://api.retellai.com";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // Retell's documented per-file ceiling

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

    const ct = req.headers.get("content-type") ?? "";
    const form = ct.includes("multipart/form-data") ? await req.formData() : null;
    const body = form ? null : await req.json().catch(() => ({}));
    const action = String(form?.get("action") ?? body?.action ?? "");

    // Confirms the caller owns this KB before any Retell call touches it.
    const ownKb = async (kbId: string) => {
      const { data } = await supabase
        .from("knowledge_bases")
        .select("id, retell_kb_id")
        .eq("user_id", userId)
        .eq("retell_kb_id", kbId)
        .maybeSingle();
      return data;
    };

    const buildUpstream = (f: FormData) => {
      const up = new FormData();
      const texts = String(f.get("texts") ?? "").trim();
      const urls = String(f.get("urls") ?? "").trim();
      if (texts && texts !== "[]") up.append("knowledge_base_texts", texts);
      if (urls && urls !== "[]") up.append("knowledge_base_urls", urls);
      for (const file of f.getAll("files")) {
        if (file instanceof File) {
          if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" is larger than 50MB.`);
          up.append("knowledge_base_files", file, file.name);
        }
      }
      return up;
    };

    if (action === "create") {
      if (!form) return json({ error: "Creating a knowledge base requires a form upload." }, 400);
      const name = String(form.get("name") ?? "").trim();
      if (!name || name.length > 40) {
        return json({ error: "Give the knowledge base a name of up to 40 characters." }, 400);
      }
      const up = buildUpstream(form);
      up.append("knowledge_base_name", name);
      if (String(form.get("auto_refresh") ?? "") === "true") up.append("enable_auto_refresh", "true");
      if (!up.has("knowledge_base_texts") && !up.has("knowledge_base_urls") && !up.has("knowledge_base_files")) {
        return json({ error: "Add at least one source: a web page, a document or some text." }, 400);
      }

      const res = await fetch(`${RETELL}/create-knowledge-base`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: up,
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { data = { message: text }; }
      if (!res.ok || !data.knowledge_base_id) {
        console.error("[knowledge-base] create failed", res.status, text);
        return json({ error: (data.message as string) ?? "Could not create the knowledge base." }, res.status || 502);
      }

      const { error: insErr } = await supabase.from("knowledge_bases").insert({
        user_id: userId,
        retell_kb_id: data.knowledge_base_id as string,
        name: (data.knowledge_base_name as string) ?? name,
        status: (data.status as string) ?? "in_progress",
        source_count: ((data.knowledge_base_sources as unknown[]) ?? []).length,
        auto_refresh: Boolean(data.enable_auto_refresh),
      });
      if (insErr) {
        // It exists upstream but we failed to record ownership — say so rather
        // than leave an orphan the user can neither see nor delete.
        console.error("[knowledge-base] insert failed", insErr, data.knowledge_base_id);
        return json({ error: "Knowledge base was created but could not be saved to your account." }, 500);
      }
      return json(data, 201);
    }

    if (action === "add-sources") {
      if (!form) return json({ error: "Adding sources requires a form upload." }, 400);
      const kbId = String(form.get("kb_id") ?? "");
      if (!(await ownKb(kbId))) return json({ error: "Knowledge base not found." }, 404);
      const up = buildUpstream(form);
      if (!up.has("knowledge_base_texts") && !up.has("knowledge_base_urls") && !up.has("knowledge_base_files")) {
        return json({ error: "Add at least one source." }, 400);
      }
      const res = await fetch(`${RETELL}/add-knowledge-base-sources/${encodeURIComponent(kbId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: up,
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { data = { message: text }; }
      if (!res.ok) {
        console.error("[knowledge-base] add-sources failed", res.status, text);
        return json({ error: (data.message as string) ?? "Could not add sources." }, res.status || 502);
      }
      await supabase.from("knowledge_bases").update({
        status: (data.status as string) ?? "in_progress",
        source_count: ((data.knowledge_base_sources as unknown[]) ?? []).length,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("retell_kb_id", kbId);
      return json(data);
    }

    if (action === "refresh") {
      // Pulls current indexing status/sources so the UI can stop polling.
      const kbId = String(body?.kb_id ?? form?.get("kb_id") ?? "");
      if (!(await ownKb(kbId))) return json({ error: "Knowledge base not found." }, 404);
      const res = await fetch(`${RETELL}/get-knowledge-base/${encodeURIComponent(kbId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return json({ error: "Could not read the knowledge base." }, res.status);
      const data = await res.json();
      await supabase.from("knowledge_bases").update({
        status: data.status ?? "complete",
        source_count: (data.knowledge_base_sources ?? []).length,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("retell_kb_id", kbId);
      return json(data);
    }

    if (action === "delete") {
      const kbId = String(body?.kb_id ?? form?.get("kb_id") ?? "");
      const owned = await ownKb(kbId);
      if (!owned) return json({ error: "Knowledge base not found." }, 404);
      const res = await fetch(`${RETELL}/delete-knowledge-base/${encodeURIComponent(kbId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      // 404 upstream means it's already gone; drop our row either way so the
      // list can't show a knowledge base that no longer exists.
      if (!res.ok && res.status !== 404) {
        console.error("[knowledge-base] delete failed", res.status, await res.text());
        return json({ error: "Could not delete the knowledge base." }, res.status);
      }
      await supabase.from("knowledge_bases").delete().eq("user_id", userId).eq("retell_kb_id", kbId);
      return json({ ok: true });
    }

    return json({ error: `Unknown action "${action}".` }, 400);
  } catch (e) {
    console.error("[knowledge-base] threw", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
