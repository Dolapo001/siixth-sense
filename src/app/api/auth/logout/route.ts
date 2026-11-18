import { cookies } from "next/headers";
import { crossSiteRefusal, isSameOrigin } from "@/features/authentication/server/same-origin.server";
import { REFRESH_COOKIE, backendFetch, clearTokens } from "@/lib/api/backend.server";
import { liveApiEnabled } from "@/lib/api/config";

/** Ends the session: the backend blacklists the refresh token, and the cookies go. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refresh && liveApiEnabled()) {
    try {
      await backendFetch("auth/logout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch (error) {
      // Signing out locally still matters; the refresh token expires on its own.
      console.error("Backend logout failed", error);
    }
  }
  await clearTokens();
  return new Response(null, { status: 204 });
}
