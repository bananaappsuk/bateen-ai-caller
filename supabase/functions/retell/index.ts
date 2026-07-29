// Retell AI proxy edge function.
// All Retell API calls from the frontend go through this function so the
// RETELL_API_KEY never leaves the server.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // This proxy forwards whatever path/method/body it's given straight to
  // Retell using the platform's own API key — it has no per-resource
  // ownership check (Retell has no concept of this app's tenants). Requiring
  // a valid signed-in Supabase user at least stops it being a fully open,
  // unauthenticated relay reachable by anyone who has the public anon key
  // (which is, by definition, public — it ships in the frontend bundle).
  // Phone-number actions (add/link/unlink/remove/sync) no longer use this
  // proxy at all; they go through their own ownership-checked edge functions.
  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "");
  if (!token) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const apiKey = Deno.env.get("RETELL_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "RETELL_API_KEY is not configured on the server." },
      500,
    );
  }

  let callerId = "unknown";
  {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data } = await authClient.auth.getUser(token);
    if (!data.user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }
    callerId = data.user.id;
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

  // Honor an explicit version prefix (/v1, /v2, /v3, …) if the caller provided
  // one; otherwise auto-prefix /v2 for the legacy endpoint set (back-compat).
  const hasVersion = /^\/v[0-9]+(?=\/|$)/.test(path);
  const upstreamPath = hasVersion
    ? path
    : [...V2_ENDPOINTS].some(
          (endpoint) => path === endpoint || path.startsWith(`${endpoint}/`),
        )
      ? `/v2${path}`
      : path;
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

  console.log(
    `[retell] user=${callerId} -> ${init.method} ${upstreamUrl.toString()} payload=${
      hasBody ? JSON.stringify(body) : "(none)"
    }`,
  );

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
      console.error(
        `[retell] user=${callerId} <- ${init.method} ${upstreamPath} FAILED status=${upstream.status} body=${text}`,
      );
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

    console.log(`[retell] user=${callerId} <- ${init.method} ${upstreamPath} status=${upstream.status}`);
    return jsonResponse(data ?? {});
  } catch (err) {
    console.error(`[retell] user=${callerId} <- ${init.method} ${upstreamPath} network error:`, err);
    return jsonResponse(
      {
        error: "Failed to reach Retell API.",
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }
});
