/**
 * CSRF guard for the auth routes: browsers send Origin on POST, and it must be
 * this site. (Session cookies are SameSite=Lax too; this closes the gaps.)
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export const crossSiteRefusal = () =>
  Response.json({ error: { code: "cross_site", message: "Sign-in must come from this site." } }, { status: 403 });
