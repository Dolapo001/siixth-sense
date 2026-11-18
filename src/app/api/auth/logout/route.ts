import { cookies } from "next/headers";
import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import { SESSION_COOKIE } from "@/features/authentication/siws";

/** Ends the session. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
  return new Response(null, { status: 204 });
}
