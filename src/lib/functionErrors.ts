// One place that turns an edge-function failure into something a user can act on.
//
// supabase-js reports every non-2xx as "Edge Function returned a non-2xx status
// code" and hides the body on the error's `context` response. Surfacing that
// string directly is what left a dev staring at a stalled campaign with no idea
// their session had expired, so every service routes failures through here.

export interface FunctionFailure {
  message: string;
  status?: number;
  /** True when signing in again is what fixes it. */
  sessionExpired: boolean;
}

/** Status codes the platform returns with a meaning worth saying out loud. */
function byStatus(status: number): string | null {
  switch (status) {
    case 401:
    case 403:
      return "Your session has expired. Refresh the page and sign in again to continue.";
    case 402:
      // Retell returns this when the account is suspended for non-payment.
      return "Calling is temporarily unavailable. Please contact support.";
    case 404:
      return "That item no longer exists. Refresh the page.";
    case 413:
      return "That file is too large to upload.";
    case 429:
      return "Too many requests at once. Wait a moment and try again.";
    case 503:
    case 504:
      return "The service is busy. Try again in a moment.";
    default:
      return status >= 500 ? "Something went wrong on our side. Try again." : null;
  }
}

/**
 * Builds the message to show for a failed `functions.invoke`.
 * `data.error` wins when present — an edge function's own wording is always
 * more specific than anything inferable from a status code.
 */
export async function describeFunctionFailure(
  error: unknown,
  data: unknown,
  fallback = "Something went wrong. Please try again.",
): Promise<FunctionFailure> {
  const fromData = (data as { error?: string } | null | undefined)?.error;
  const response = (error as { context?: Response } | null | undefined)?.context;
  const status = typeof response?.status === "number" ? response.status : undefined;
  const sessionExpired = status === 401 || status === 403;

  // A 401 outranks whatever the body said: edge functions answer with a terse
  // "Unauthorized.", which is precisely the message that tells a user nothing.
  if (sessionExpired) {
    return { message: byStatus(status as number) as string, status, sessionExpired };
  }

  if (fromData) return { message: fromData, status, sessionExpired };

  if (response) {
    // The body carries the function's own message; reading a clone leaves the
    // original response usable by anything else holding it.
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    const fromBody = (body as { error?: string; message?: string } | null)?.error
      ?? (body as { message?: string } | null)?.message;
    if (fromBody) return { message: fromBody, status, sessionExpired };
  }

  if (status) {
    const mapped = byStatus(status);
    if (mapped) return { message: mapped, status, sessionExpired };
  }

  // Network failures reach here with no response at all.
  if (error instanceof Error && error.message && !/non-2xx status code/i.test(error.message)) {
    return { message: error.message, status, sessionExpired };
  }
  return { message: fallback, status, sessionExpired };
}

/** Throwing form, for services that only need the message. */
export async function throwFunctionError(error: unknown, data: unknown, fallback?: string): Promise<never> {
  const { message } = await describeFunctionFailure(error, data, fallback);
  throw new Error(message);
}

/** Postgres error codes whose raw wording means nothing to a user. */
const DB_CODES: Record<string, string> = {
  // RLS rejected the write. Always our bug — a missing or wrong policy — so say
  // something true without blaming the user for it.
  "42501": "You do not have permission to make that change. Please contact support.",
  "23505": "That already exists.",
  "23503": "That refers to something that no longer exists. Refresh the page.",
  "23502": "Something required was missing. Check the form and try again.",
  "22P02": "One of the values was not in a format we understand.",
  PGRST301: "Your session has expired. Refresh the page and sign in again to continue.",
};

/**
 * Turns whatever a failed query threw into a real `Error`.
 *
 * supabase-js rejects table operations with a plain `{ message, code, details,
 * hint }` object, which is not an `Error`. Callers almost all narrow with
 * `err instanceof Error`, so a raw rejection fell through to their generic
 * fallback and the real cause never reached the screen — a missing RLS policy
 * on `inbound_numbers` showed up only as "Could not add the number."
 */
export function asError(error: unknown, fallback = "Something went wrong. Try again."): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; details?: unknown };
    const code = typeof e.code === "string" ? e.code : undefined;
    const raw = typeof e.message === "string" ? e.message : undefined;

    // A known code outranks the raw wording: "new row violates row-level
    // security policy for table ..." is accurate and useless.
    const known = code ? DB_CODES[code] : undefined;
    const err = new Error(known ?? raw ?? fallback);
    if (code) (err as Error & { code?: string }).code = code;
    return err;
  }

  return new Error(typeof error === "string" && error.trim() ? error : fallback);
}
