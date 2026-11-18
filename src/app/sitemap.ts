import type { MetadataRoute } from "next";
import { getWorldOverview } from "@/features/world/data/gtadb.server";
import { publicPagesIndexable, publicPaths, worldPagesIndexable } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * The landing page, the World Explorer and every place on the
 * GTA VI map; other public pages once the backend serves their content.
 * Discovery and contributor pages are added once the backend can list them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  const paths = [
    "/",
    ...(worldPagesIndexable ? ["/world"] : []),
    ...(publicPagesIndexable ? publicPaths : []),
  ];
  const places = worldPagesIndexable
    ? getWorldOverview().markers.map((marker) => `/world/${encodeURIComponent(marker.locationId)}`)
    : [];
  return [...paths, ...places].map((path) => ({ url: `${site}${path === "/" ? "" : path}` }));
}
