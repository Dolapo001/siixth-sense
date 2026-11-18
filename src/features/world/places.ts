import type { FeatureCollection, Point } from "geojson";
import { worldToLngLat } from "./coordinates";
import type { WorldLayerId } from "./layers";
import type { WorldBounds, WorldMarker } from "./types";

/** Placed markers as GeoJSON for the map's clustered "places" source. */
export function placesToGeoJSON(markers: WorldMarker[]): FeatureCollection<Point, PlaceProps> {
  return {
    type: "FeatureCollection",
    features: markers
      .filter((marker) => marker.coordinate)
      .map((marker) => ({
        type: "Feature",
        // Numeric feature ids aren't needed; selection filters on the `id` property.
        properties: { id: marker.id, layer: marker.layer ?? "other", title: marker.title, named: marker.nameKnown !== false },
        geometry: { type: "Point", coordinates: worldToLngLat(marker.coordinate!) },
      })),
  };
}

export type PlaceProps = { id: string; layer: WorldLayerId; title: string; named: boolean };

/** Smallest box around the markers' coordinates, grown to at least `minSize` metres across. */
export function boundsOf(markers: WorldMarker[], minSize = 600): WorldBounds | null {
  const points = markers.flatMap((marker) => (marker.coordinate ? [marker.coordinate] : []));
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const grow = (min: number, max: number) => Math.max(0, (minSize - (max - min)) / 2);
  const gx = grow(Math.min(...xs), Math.max(...xs));
  const gy = grow(Math.min(...ys), Math.max(...ys));
  return { minX: Math.min(...xs) - gx, maxX: Math.max(...xs) + gx, minY: Math.min(...ys) - gy, maxY: Math.max(...ys) + gy };
}

export type Neighbourhood = { name: string; markers: WorldMarker[] };

/**
 * The places in an area, grouped by the next level of their address
 * ("Vice Regal, Washington Beach, Vice Beach" → Washington Beach within Vice Beach).
 * Places addressed only to the area itself are grouped last, as "Elsewhere in <area>".
 * Uses only the hierarchy in the data; nothing is inferred from position.
 */
export function neighbourhoodsOf(markers: WorldMarker[], area: string): Neighbourhood[] {
  const groups = new Map<string, WorldMarker[]>();
  const elsewhere: WorldMarker[] = [];
  for (const marker of markers) {
    const areas = marker.areas ?? [];
    if (areas.at(-1) !== area) continue;
    const below = areas.at(-2);
    if (below) groups.set(below, [...(groups.get(below) ?? []), marker]);
    else elsewhere.push(marker);
  }
  const named = [...groups.entries()]
    .map(([name, members]) => ({ name, markers: members }))
    .sort((a, b) => b.markers.length - a.markers.length || a.name.localeCompare(b.name));
  return elsewhere.length ? [...named, { name: `Elsewhere in ${area}`, markers: elsewhere }] : named;
}

/** Places per area (broadest address part), for the browse list. */
export function countByArea(markers: WorldMarker[]) {
  const counts = new Map<string, number>();
  for (const marker of markers) {
    const area = marker.areas?.at(-1);
    if (area) counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return counts;
}
