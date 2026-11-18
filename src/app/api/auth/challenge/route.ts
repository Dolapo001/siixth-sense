import { cookies } from "next/headers";
import { cookieOptions, isSolanaAddress, newNonce, signToken } from "@/features/authentication/server/auth.server";
import { CHALLENGE_COOKIE, CHALLENGE_TTL_SECONDS, signInMessage } from "@/features/authentication/siws";

const refuse = (message: string, status = 400) => Response.json({ error: { code: "bad_request", message } }, { status });

/**
 * Step 1 of wallet sign-in: a one-time message for the wallet to sign. The
 * exact message travels in a signed, HTTP-only cookie, so step 2 checks the
 * signature against what this server issued, not what the browser sends back.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  if (!isSolanaAddress(body?.address)) return refuse("That isn't a valid Solana wallet address.");

  const url = new URL(request.url);
  const issued = new Date();
  const expires = new Date(issued.getTime() + CHALLENGE_TTL_SECONDS * 1000);
  const message = signInMessage({
    domain: url.host,
    uri: url.origin,
    address: body.address,
    nonce: newNonce(),
    issuedAt: issued.toISOString(),
    expirationTime: expires.toISOString(),
    chainId: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  });

  (await cookies()).set(
    CHALLENGE_COOKIE,
    signToken({ address: body.address, message, exp: Math.floor(expires.getTime() / 1000) }),
    cookieOptions(CHALLENGE_TTL_SECONDS, "/api/auth"),
  );
  return Response.json({ message }, { headers: { "Cache-Control": "no-store" } });
}
