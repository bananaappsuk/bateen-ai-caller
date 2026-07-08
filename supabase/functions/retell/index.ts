// Retell AI proxy edge function.
// All Retell API calls from the frontend go through this function so the
// RETELL_API_KEY never leaves the server.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEFAULT_RETELL_BASE_URL = "https://api.retellai.com";

const V2_ENDPOINTS = new Set([
  "/create-web-call",
  "/create-phone-call",
  "/get-call",
  "/list-calls",
  "/list-agents",
]);

function normalizeRetellBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.replace(/\/v2$/, "");
}

const RETELL_BASE_URL = normalizeRetellBaseUrl(
  Deno.env.get("RETELL_API_BASE_URL") || DEFAULT_RETELL_BASE_URL,
);

type ProxyRequest = {
  path: string;               // e.g. "/create-agent", "/create-web-call", "/get-agent/agent_xxx"
  method?: string;            // GET | POST | PATCH | DELETE  (default: GET)
  body?: unknown;             // JSON body for POST/PATCH
  query?: Record<string, string | number | boolean | undefined>;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RETELL_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "RETELL_API_KEY is not configured on the server." },
      500,
    );
  }

  let payload: ProxyRequest;
  try {
    payload = (await req.json()) as ProxyRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const { path, method = "GET", body, query } = payload ?? {};
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    return jsonResponse({ error: "`path` must be a string starting with '/'." }, 400);
  }

  const normalizedPath = path.replace(/^\/v2(?=\/|$)/, "");
  const upstreamPath = [...V2_ENDPOINTS].some((endpoint) =>
      normalizedPath === endpoint || normalizedPath.startsWith(`${endpoint}/`)
    )
    ? `/v2${normalizedPath}`
    : normalizedPath;
  const upstreamUrl = new URL(RETELL_BASE_URL + upstreamPath);
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) upstreamUrl.searchParams.set(k, String(v));
    }
  }

  const hasBody = body !== undefined && method.toUpperCase() !== "GET";
  const init: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  };

  try {
    const upstream = await fetch(upstreamUrl.toString(), init);
    const text = await upstream.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!upstream.ok) {
      return jsonResponse(
        {
          error: (data as { error?: string } | null)?.error ??
            `Retell API request failed (${upstream.status}).`,
          status: upstream.status,
          details: data,
        },
        upstream.status,
      );
    }

    return jsonResponse(data ?? {});
  } catch (err) {
    return jsonResponse(
      {
        error: "Failed to reach Retell API.",
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }
});
