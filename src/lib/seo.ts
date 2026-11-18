import type { Metadata } from "next";

/*
 * Search indexing rules.
 *
 * The whole app sits behind sign-in (src/proxy.ts), so crawlers only ever
 * reach the landing page. The platform pages keep their public metadata
 * (canonicals, social tags) but stay out of search and the sitemap; flip
 * these flags back on if any of them are opened to signed-out visitors.
 * Personal and account pages are never indexed.
 */

export const publicPagesIndexable = false;

/** Public platform pages that wait for the backend, in sitemap order. */
export const publicPaths = ["/discoveries", "/community", "/leaderboard"] as const;

/** The World pages (the GTA VI community map and its places). Behind sign-in like the rest. */
export const worldPagesIndexable = false;

/** Never indexed: personal, account and internal pages. */
export const privatePaths = [
  "/analyze",
  "/profile$", // your own profile only; /profile/[username] is public
  "/settings",
  "/notifications",
  "/verify-email",
  "/rewards",
  "/web3",
  "/admin",
  "/auth",
  "/design-system",
] as const;

export const noIndex: Metadata["robots"] = { index: false, follow: false };

type PublicPageInput = { title: string; description: string; path: string; indexable?: boolean };

/** Metadata for a public platform page: description, canonical, social tags and indexing. */
export function publicPage({ title, description, path, indexable = publicPagesIndexable }: PublicPageInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    // Page-level openGraph replaces the root one, so restate the shared fields.
    openGraph: { title: `${title} · Sixth Sense`, description, url: path, siteName: "Sixth Sense", type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · Sixth Sense`, description },
  };
}
