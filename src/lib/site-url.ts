/**
 * The site's public origin, for canonical URLs, social images, robots and
 * the sitemap. NEXT_PUBLIC_SITE_URL wins; on Vercel the production (or
 * preview) domain is used when it isn't set, so shared links never point
 * at localhost.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const vercelHost =
    process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}
