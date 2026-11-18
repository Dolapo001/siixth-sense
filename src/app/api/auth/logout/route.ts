import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/features/authentication/siws";

/** Ends the session. */
export async function POST() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
  return new Response(null, { status: 204 });
}
