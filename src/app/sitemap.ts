import type { MetadataRoute } from "next";
import { publicPagesIndexable, publicPaths } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * Static routes only. Discovery, location and contributor pages are added
 * once the backend can list them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  const paths = ["/", "/developers", ...(publicPagesIndexable ? publicPaths : [])];
  return paths.map((path) => ({ url: `${site}${path === "/" ? "" : path}` }));
}
