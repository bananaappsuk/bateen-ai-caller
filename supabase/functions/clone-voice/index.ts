// Clone a user's voice with Retell and record it as theirs.
//
// This can't go through the shared `retell` proxy: that proxy is JSON-only
// (it JSON.stringify's the body), and cloning needs multipart/form-data with a
// binary audio file.
//
// Verified against the live Retell API (2026-09-07):
//   POST https://api.retellai.com/clone-voice   multipart/form-data
//     files          = one audio file  (wav | mp3 | m4a ONLY — webm is rejected)
//     voice_name     = 1-200 chars
//     voice_provider = "platform"   (telephony-tuned, auto TTS fallback,
//                                    same $0.015/min as the stock voices)
//   201 -> { voice_id: "custom_voice_<hash>", voice_type: "custom",
//            voice_name, provider, avatar_url, preview_audio_url }
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Retell rejects anything else, so fail early with a message the UI can show
// rather than surfacing a raw upstream 400.
const ALLOWED_EXT = ["wav", "mp3", "m4a"];
const MAX_BYTES = 25 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("RETELL_API_KEY");
    if (!apiKey) return json({ error: "RETELL_API_KEY is not configured on the server." }, 500);

    // Caller must be a signed-in user — the clone is recorded against them.
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

    const form = await req.formData();
    const file = form.get("file");
    const voiceName = String(form.get("voice_name") ?? "").trim();
    if (!(file instanceof File)) return json({ error: "An audio file is required." }, 400);
    if (!voiceName || voiceName.length > 200) {
      return json({ error: "Give the voice a name (up to 200 characters)." }, 400);
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return json({ error: `Audio must be a ${ALLOWED_EXT.join(", ")} file.` }, 400);
    }
    if (file.size > MAX_BYTES) return json({ error: "That recording is too large (max 25MB)." }, 400);
    if (file.size < 20_000) return json({ error: "That recording is too short — record about a minute." }, 400);

    const upstream = new FormData();
    upstream.append("files", file, file.name);
    upstream.append("voice_name", voiceName);
    upstream.append("voice_provider", "platform");

    const res = await fetch("https://api.retellai.com/clone-voice", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` }, // no Content-Type: fetch sets the multipart boundary
      body: upstream,
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    if (!res.ok || !data.voice_id) {
      console.error("[clone-voice] retell failed", res.status, text);
      return json({ error: (data.message as string) ?? "Voice cloning failed. Please try again." }, res.status || 502);
    }

    // Record ownership so list-agent-voices can keep tenants apart.
    const { error: insertError } = await supabase.from("custom_voices").insert({
      user_id: userId,
      retell_voice_id: data.voice_id as string,
      voice_name: (data.voice_name as string) ?? voiceName,
      provider: (data.provider as string) ?? "platform",
      preview_audio_url: (data.preview_audio_url as string) ?? null,
      avatar_url: (data.avatar_url as string) ?? null,
    });
    if (insertError) {
      // The clone exists on Retell but we failed to record it. Say so plainly
      // rather than pretending it worked — an unrecorded clone is invisible to
      // its owner and can't be cleaned up.
      console.error("[clone-voice] insert failed", insertError, data.voice_id);
      return json({ error: "Voice was created but could not be saved to your account. Contact support." }, 500);
    }

    return json({
      voice_id: data.voice_id,
      voice_name: data.voice_name ?? voiceName,
      provider: data.provider ?? "platform",
      preview_audio_url: data.preview_audio_url ?? null,
    }, 201);
  } catch (e) {
    console.error("[clone-voice] threw", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
