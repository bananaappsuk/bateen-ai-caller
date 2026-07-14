// Fetch the user's Cal.com event types (VocalMax calComFetchEventTypes) so the
// integration UI can offer a dropdown instead of a manual event-type ID.
// Body: { apiKey } -> { eventTypes: [{ id, title, length }] }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return json({ error: "Cal.com API key is required." }, 400);
    const res = await fetch(`https://api.cal.com/v1/event-types?apiKey=${encodeURIComponent(apiKey)}`);
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `Cal.com request failed: ${t.slice(0, 160)}` }, 502);
    }
    const data = await res.json();
    const eventTypes = (data.event_types ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      title: e.title,
      length: e.length,
    }));
    return json({ eventTypes });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
