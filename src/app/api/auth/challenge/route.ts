import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import { isSolanaAddress } from "@/features/authentication/server/wallet.server";
import { backendRefusal, forwardBackendError } from "@/features/authentication/server/auth-responses.server";
import { BackendUnavailableError, backendUrl } from "@/lib/api/backend.server";
import { readEnvelope } from "@/lib/api/client";

/**
 * Step 1 of wallet sign-in: the backend issues a one-time message for the
 * wallet to sign. The backend keeps the message itself, so step 2 only sends
 * back the nonce and the signature.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  if (!isSolanaAddress(body?.address)) return backendRefusal(400, "That isn't a valid Solana wallet address.");

  try {
    const response = await fetch(backendUrl("auth/wallet/challenge/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: body.address }),
      cache: "no-store",
    });
    const challenge = await readEnvelope<{ nonce: string; message: string; expires_at: string }>(response);
    return Response.json(
      { nonce: challenge.nonce, message: challenge.message, expiresAt: challenge.expires_at },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BackendUnavailableError) return backendRefusal(503, "Sign-in isn't available yet.");
    return forwardBackendError(error);
  }
}
