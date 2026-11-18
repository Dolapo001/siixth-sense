import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import { backendRefusal, forwardBackendError } from "@/features/authentication/server/auth-responses.server";
import { sessionUser } from "@/features/authentication/server/session.server";
import { BackendUnavailableError, backendUrl, storeTokens, type TokenPair } from "@/lib/api/backend.server";
import { ApiError, readEnvelope } from "@/lib/api/client";
import { TERMS_REQUIRED } from "@/features/authentication/siws";

/**
 * Step 2 of wallet sign-in: the backend checks the signature of the message
 * it issued (single use, burned even on a bad signature) and returns tokens,
 * which go straight into HTTP-only cookies. A wallet without an account gets
 * one, but only once the player has accepted the terms.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const body = (await request.json().catch(() => null)) as {
    nonce?: unknown;
    signature?: unknown;
    acceptTerms?: unknown;
  } | null;
  if (typeof body?.nonce !== "string" || typeof body.signature !== "string") {
    return backendRefusal(400, "The sign-in request was incomplete. Try again.");
  }

  try {
    const response = await fetch(backendUrl("auth/wallet/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce: body.nonce, signature: body.signature, accept_terms: body.acceptTerms === true }),
      cache: "no-store",
    });
    const tokens = await readEnvelope<TokenPair & { new_account: boolean }>(response);
    await storeTokens(tokens);
    return Response.json(
      { user: await sessionUser(), newAccount: tokens.new_account },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BackendUnavailableError) return backendRefusal(503, "Sign-in isn't available yet.");
    // The backend answers 409 for exactly one reason here: a new wallet that hasn't accepted the terms.
    if (error instanceof ApiError && error.status === 409) return backendRefusal(409, error.message, TERMS_REQUIRED);
    return forwardBackendError(error);
  }
}
