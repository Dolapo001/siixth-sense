import { ApiError } from "@/lib/api/client";

/** The /api/auth/* error shape the sign-in UI reads: { error: { code, message } }. */
export const backendRefusal = (status: number, message: string, code = "sign_in_failed") =>
  Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });

/** Passes the backend's own (player-safe) message on; anything unexpected becomes a generic 502. */
export function forwardBackendError(error: unknown) {
  if (error instanceof ApiError) return backendRefusal(error.status, error.message, error.code ?? "sign_in_failed");
  console.error("Sign-in request to the backend failed", error);
  return backendRefusal(502, "Sixth Sense couldn't be reached. Try again.", "server_error");
}
