import { categoryConfig } from "./categories";
import { layerConfig, type WorldLayerId } from "./layers";
import type { DiscoveryCategory, Region, WorldMarker } from "./types";

/** Markers whose category is enabled. */
export function filterMarkers(markers: WorldMarker[], categories: ReadonlySet<DiscoveryCategory>) {
  return markers.filter((marker) => categories.has(marker.category));
}

/** Markers on an enabled layer. Markers without a layer (sample data) count as "other". */
export function filterByLayers(markers: WorldMarker[], layers: ReadonlySet<WorldLayerId>) {
  return markers.filter((marker) => layers.has(marker.layer ?? "other"));
}

/** Icon and label for a marker: its layer when it has one, else its discovery category. */
export function markerKind(marker: WorldMarker) {
  if (marker.layer) {
    const { label, icon } = layerConfig[marker.layer];
    return { label, icon };
  }
  const { label, icon } = categoryConfig[marker.category];
  return { label, icon };
}

/** Only confirmed and approximate markers can be placed on the map. */
export function splitByPlacement(markers: WorldMarker[]) {
  const placed: WorldMarker[] = [];
  const unplaced: WorldMarker[] = [];
  for (const marker of markers) {
    (marker.coordinate ? placed : unplaced).push(marker);
  }
  return { placed, unplaced };
}

export type SearchResult =
  | { kind: "region"; region: Region }
  | { kind: "marker"; marker: WorldMarker };

/**
 * Case-insensitive search over area names, place names and the areas places
 * sit in ("washington beach" finds every place there). Ranked: areas, then
 * names starting with the query, then names containing it, then area matches.
 */
export function searchWorld(query: string, regions: Region[], markers: WorldMarker[], limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (text: string) => (text.startsWith(q) ? 0 : text.includes(q) ? 1 : -1);
  const regionHits = regions
    .map((region) => ({ region, score: rank(region.name.toLowerCase()) }))
    .filter((hit) => hit.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ region }): SearchResult => ({ kind: "region", region }));
  const markerHits = markers
    .map((marker) => {
      const title = rank(marker.title.toLowerCase());
      const inArea = marker.areas?.some((area) => area.toLowerCase().includes(q)) ? 2 : -1;
      return { marker, score: title >= 0 ? title : inArea };
    })
    .filter((hit) => hit.score >= 0)
    .sort((a, b) => a.score - b.score || a.marker.title.localeCompare(b.marker.title))
    .map(({ marker }): SearchResult => ({ kind: "marker", marker }));
  return [...regionHits, ...markerHits].slice(0, limit);
}
