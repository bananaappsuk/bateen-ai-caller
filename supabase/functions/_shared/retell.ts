// Minimal server-side Retell API caller for the phone-number ownership
// functions (add/link/unlink/remove/sync-phone-number). This is separate
// from the `retell` proxy function the frontend calls: that proxy forwards
// whatever path/method/body the browser sends, which is fine for
// account-scoped catalog reads (agents, voices, LLMs) but must never be used
// for phone-number actions now that those are ownership-checked server side.
const RETELL_BASE_URL = "https://api.retellai.com";

export async function retellApi(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const apiKey = Deno.env.get("RETELL_API_KEY");
  if (!apiKey) throw new Error("RETELL_API_KEY is not configured on the server.");

  const r = await fetch(RETELL_BASE_URL + path, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await r.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!r.ok) {
    throw new Error(
      typeof data === "object" && data ? ((data as { error?: string }).error ?? JSON.stringify(data)) : String(data),
    );
  }
  return data;
}
