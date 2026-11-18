import { sessionUser } from "@/features/authentication/server/session.server";
import { liveApiEnabled } from "@/lib/api/config";

/** Who is signed in: `{ user }`, or `{ user: null }`. Never cached. */
export async function GET() {
  let user = null;
  if (liveApiEnabled()) {
    try {
      user = await sessionUser();
    } catch (error) {
      // Backend down: show the signed-out experience rather than an error everywhere.
      console.error("Couldn't read the session from the backend", error);
    }
  }
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
