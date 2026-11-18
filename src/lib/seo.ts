import type { Metadata } from "next";

/*
 * Search indexing rules.
 *
 * Public pages (world, discoveries, community, leaderboard, contributor
 * profiles) are meant to be found. But until the backend is connected they
 * only show "not connected yet" placeholders, which shouldn't be indexed.
 * So they become indexable once NEXT_PUBLIC_API_BASE_URL is set.
 * Personal and account pages are never indexed.
 */

export const publicPagesIndexable = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

/** Public platform pages, in the order they appear in the sitemap. */
export const publicPaths = ["/world", "/discoveries", "/community", "/leaderboard"] as const;

/** Never indexed: personal, account and internal pages. */
export const privatePaths = [
  "/analyze",
  "/profile$", // your own profile only; /profile/[username] is public
  "/settings",
  "/notifications",
  "/rewards",
  "/web3",
  "/admin",
  "/auth",
  "/design-system",
] as const;

export const noIndex: Metadata["robots"] = { index: false, follow: false };

type PublicPageInput = { title: string; description: string; path: string };

/** Metadata for a public platform page: description, canonical, social tags and indexing. */
export function publicPage({ title, description, path }: PublicPageInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: publicPagesIndexable ? { index: true, follow: true } : { index: false, follow: true },
    // Page-level openGraph replaces the root one, so restate the shared fields.
    openGraph: { title: `${title} · Sixth Sense`, description, url: path, siteName: "Sixth Sense", type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · Sixth Sense`, description },
  };
}
