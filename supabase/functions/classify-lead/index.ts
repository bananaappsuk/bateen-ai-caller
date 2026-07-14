// Manual/triggered classification of a single lead (used by the dialer on call
// end and by the Leads "Re-review" action). Body: { leadId }.
import { adminClient, classifyAndNotify } from "../_shared/enrich.ts";

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
    const { leadId } = await req.json();
    if (!leadId) return json({ error: "leadId is required." }, 400);
    const label = await classifyAndNotify(adminClient(), leadId);
    return json({ label });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
