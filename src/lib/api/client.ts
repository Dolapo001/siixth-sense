/*
 * Browser-side client for the Sixth Sense backend. Every call goes through
 * this app's /api/backend proxy, which holds the session tokens in HTTP-only
 * cookies, so no token ever reaches page scripts and no CORS setup is needed.
 *
 * The backend wraps every response: { success, message, data } on success,
 * { success: false, code, message, errors } on failure. `message` is always
 * safe to show to players.
 */

export const PROXY_PREFIX = "/api/backend";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly errors: Record<string, unknown> = {},
    readonly data: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Paginated list as the backend returns it. */
export type ApiPage<T> = {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
};

type Envelope<T> = { success: boolean; message?: string; code?: string; errors?: Record<string, unknown>; data?: T };

/** The first field error, when the backend's message is only the generic "Validation failed." */
function firstFieldError(errors: Record<string, unknown> | undefined) {
  for (const value of Object.values(errors ?? {})) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return null;
}

/** Unwraps a backend response, throwing ApiError (with the server's own message) on failure. */
export async function readEnvelope<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body?.success) {
    const generic = response.status >= 500 ? "Sixth Sense is having trouble right now. Try again." : "That didn't go through.";
    const fieldError = firstFieldError(body?.errors);
    const message =
      body?.message && !(body.message === "Validation failed." && fieldError) ? body.message : (fieldError ?? generic);
    throw new ApiError(message, response.status, body?.code ?? null, body?.errors ?? {}, body?.data ?? null);
  }
  return body.data as T;
}

type RequestOptions = {
  method?: string;
  /** JSON-encoded unless it's FormData. */
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
  signal?: AbortSignal;
};

export function apiUrl(path: string, query?: RequestOptions["query"]) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  // The proxy adds the backend's trailing slash; sending one here would only earn a redirect from Next.js.
  return `${PROXY_PREFIX}/${path.replace(/^\/+|\/+$/g, "")}${search ? `?${search}` : ""}`;
}

/** Calls a backend route (path relative to /api/v1, with its trailing slash) and returns `data`. */
export async function api<T>(path: string, { method = "GET", body, query, signal }: RequestOptions = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(apiUrl(path, query), {
    method,
    signal,
    credentials: "same-origin",
    headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  return readEnvelope<T>(response);
}
