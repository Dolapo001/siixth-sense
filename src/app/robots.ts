import type { MetadataRoute } from "next";
import { privatePaths } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...privatePaths] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
