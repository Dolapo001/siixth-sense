import { getLocationDetail } from "@/features/world/data/gtadb.server";

/** Interim location detail from the pinned GTA VI community snapshot. 404 when unknown. */
export async function GET(_request: Request, { params }: RouteContext<"/api/world/locations/[locationId]">) {
  const { locationId } = await params;
  const location = getLocationDetail(locationId);
  if (!location) return Response.json({ error: { code: "not_found", message: "No such location." } }, { status: 404 });
  return Response.json(location, { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" } });
}
