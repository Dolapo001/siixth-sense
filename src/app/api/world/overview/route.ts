import { getWorldOverview } from "@/features/world/data/gtadb.server";

/**
 * Interim world overview for the World Explorer: bounds, areas and landmark
 * markers from the pinned GTA VI community snapshot. Static: built once.
 * Replaced by the Sixth Sense backend's world endpoints when they exist.
 * Browsers revalidate every time (the shape changes as the map gains features);
 * the CDN caches for an hour.
 */
export function GET() {
  return Response.json(getWorldOverview(), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
