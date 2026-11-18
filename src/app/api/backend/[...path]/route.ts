import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import { BackendUnavailableError, backendFetch } from "@/lib/api/backend.server";

/*
 * Proxy from the browser to the Sixth Sense backend: /api/backend/<path> ->
 * <NEXT_PUBLIC_API_BASE_URL>/<path>/, adding the player's access token from
 * its HTTP-only cookie (and refreshing it when it has expired).
 *
 * Token-issuing auth routes are refused here: signing in and out goes through
 * /api/auth/*, which keeps the tokens in cookies instead of handing them to
 * page scripts.
 */

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_HEADERS = ["content-type", "accept", "x-request-id"];
const RESPONSE_HEADERS = ["content-type", "retry-after", "x-request-id"];

const refuse = (status: number, code: string, message: string) =>
  Response.json({ success: false, code, message, errors: {} }, { status, headers: { "Cache-Control": "no-store" } });

function allowedPath(segments: string[]) {
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return false;
  // Only the account endpoint under auth/: the rest issue or revoke tokens.
  return segments[0] !== "auth" || (segments.length === 2 && segments[1] === "me");
}

async function proxy(request: Request, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  if (!allowedPath(path)) return refuse(404, "not_found", "Not found.");
  if (UNSAFE.has(request.method) && !isSameOrigin(request)) return crossSiteRefusal();

  // backendFetch adds the player's address headers for the backend's throttles.
  const headers: Record<string, string> = {};
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // Buffered, not streamed: a retry after refreshing the token sends the body again.
  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();
  const search = new URL(request.url).search;

  let upstream: Response;
  try {
    upstream = await backendFetch(`${path.map(encodeURIComponent).join("/")}/${search}`, {
      method: request.method,
      headers,
      body,
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof BackendUnavailableError) return refuse(503, "not_configured", "Sixth Sense isn't connected yet.");
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("Backend request failed", error);
    return refuse(502, "server_error", "Sixth Sense couldn't be reached. Try again.");
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
