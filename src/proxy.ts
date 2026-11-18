import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/backend.server";

/*
 * The app is for signed-in players only. Signed-out visitors can see the
 * landing page, sign in, and open an email verification link; everything else
 * sends them to sign-in and back again afterwards.
 *
 * This is an optimistic check on the session cookies only. The backend still
 * decides on every request: an expired or revoked session gets its 401 there.
 * The refresh cookie counts because an expired access token is renewed from it.
 */

const PUBLIC_PATHS = new Set(["/", "/verify-email"]);

const isPublic = (path: string) => PUBLIC_PATHS.has(path) || path === "/auth" || path.startsWith("/auth/");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const signedIn = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (signedIn) return NextResponse.next();

  const login = new URL("/auth/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except API routes (they answer 401 themselves), Next's assets,
    // metadata routes and files with an extension (public/, icon.svg…).
    "/((?!api/|_next/|apple-icon|icon|opengraph-image|twitter-image|manifest|robots|sitemap|.*\\.[\\w]+$).*)",
  ],
};
