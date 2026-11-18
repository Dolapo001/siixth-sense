import { cookies } from "next/headers";
import { contributorFor, readToken } from "@/features/authentication/server/auth.server";
import { SESSION_COOKIE } from "@/features/authentication/siws";

/** Who is signed in: `{ user }`, or `{ user: null }`. Never cached. */
export async function GET() {
  const session = readToken<{ sub: string; exp: number }>((await cookies()).get(SESSION_COOKIE)?.value);
  return Response.json(
    { user: session ? contributorFor(session.sub) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
