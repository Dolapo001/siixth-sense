import { cookies } from "next/headers";
import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import {
  contributorFor,
  cookieOptions,
  readToken,
  signToken,
  verifyWalletSignature,
} from "@/features/authentication/server/auth.server";
import { CHALLENGE_COOKIE, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/features/authentication/siws";

const refuse = (message: string, status = 401) => Response.json({ error: { code: "sign_in_failed", message } }, { status });

/**
 * Step 2 of wallet sign-in: checks the wallet's signature of the challenge
 * this server issued, then starts a session. The challenge is single-use:
 * its cookie is cleared whether or not the signature checks out.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const jar = await cookies();
  const challenge = readToken<{ address: string; message: string; exp: number }>(jar.get(CHALLENGE_COOKIE)?.value);
  jar.delete({ name: CHALLENGE_COOKIE, path: "/api/auth" });
  if (!challenge) return refuse("The sign-in request expired. Try again.");

  const body = (await request.json().catch(() => null)) as { address?: unknown; signature?: unknown } | null;
  if (body?.address !== challenge.address || typeof body.signature !== "string") {
    return refuse("That signature is for a different wallet. Try again.");
  }
  if (!verifyWalletSignature(challenge.address, challenge.message, body.signature)) {
    return refuse("The wallet signature didn't check out. Try again.");
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  jar.set(SESSION_COOKIE, signToken({ sub: challenge.address, exp }), cookieOptions(SESSION_TTL_SECONDS));
  return Response.json({ user: contributorFor(challenge.address) }, { headers: { "Cache-Control": "no-store" } });
}
