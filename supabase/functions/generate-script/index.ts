// AI script builder (VocalMax agent-builder). Body: { businessName,
// businessDescription, targetAudience, goal } -> { script }. Uses OpenAI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { businessName, businessDescription, targetAudience, goal } = await req.json();
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "OpenAI is not configured on the server." }, 400);

    const system =
      "You are an expert at writing outbound phone-call scripts for AI voice agents. " +
      "Write a natural, warm, concise system prompt/script the agent will follow. " +
      "Include: a short friendly opener that discloses it's an AI if asked, one qualifying question, " +
      "how to handle interest / objections / not-interested, and a clear call-to-action toward the goal. " +
      "Keep it conversational and under ~250 words. " +
      "Write it as plain instructions/example lines only — never as a dialogue script with speaker labels " +
      '(e.g. do not write "Mia: \\"...\\"") and never wrap lines in quotation marks, since the agent will ' +
      "speak that formatting out loud verbatim. Mention the agent's own name only in the opening line, not " +
      "in every example line. Return ONLY the script text, no preamble.";
    const user = [
      `Business: ${businessName || "(unspecified)"}`,
      `What they do: ${businessDescription || "(unspecified)"}`,
      `Target audience: ${targetAudience || "(unspecified)"}`,
      `Goal of the call: ${goal || "qualify the lead and book a follow-up"}`,
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return json({ error: `OpenAI request failed: ${err.slice(0, 200)}` }, 502);
    }
    const data = await res.json();
    const script = data.choices?.[0]?.message?.content?.trim() ?? "";
    return json({ script });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
