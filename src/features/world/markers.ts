import Supercluster from "supercluster";
import { worldToLngLat } from "./coordinates";
import type { DiscoveryCategory, Region, WorldBounds, WorldMarker } from "./types";

/** Markers whose category is enabled. */
export function filterMarkers(markers: WorldMarker[], categories: ReadonlySet<DiscoveryCategory>) {
  return markers.filter((marker) => categories.has(marker.category));
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

/** Case-insensitive name search over regions and markers. Regions first. */
export function searchWorld(query: string, regions: Region[], markers: WorldMarker[], limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const regionHits: SearchResult[] = regions
    .filter((region) => region.name.toLowerCase().includes(q))
    .map((region) => ({ kind: "region", region }));
  const markerHits: SearchResult[] = markers
    .filter((marker) => marker.title.toLowerCase().includes(q))
    .map((marker) => ({ kind: "marker", marker }));
  return [...regionHits, ...markerHits].slice(0, limit);
}

type MarkerProps = { markerId: string };

export type MapItem =
  | { type: "cluster"; id: number; count: number; lngLat: [number, number] }
  | { type: "marker"; marker: WorldMarker; lngLat: [number, number] };

/** Spatial index for clustering. Rebuild when the marker set changes. */
export function createMarkerIndex(markers: WorldMarker[], world: WorldBounds) {
  const byId = new Map(markers.map((marker) => [marker.id, marker]));
  const index = new Supercluster<MarkerProps, MarkerProps>({ radius: 56, maxZoom: 14 });
  index.load(
    markers
      .filter((marker) => marker.coordinate)
      .map((marker) => ({
        type: "Feature" as const,
        properties: { markerId: marker.id },
        geometry: { type: "Point" as const, coordinates: worldToLngLat(marker.coordinate!) },
      })),
  );

  return {
    /** Clusters and single markers visible in a [west, south, east, north] box at a zoom level. */
    getItems(bbox: [number, number, number, number], zoom: number): MapItem[] {
      return index.getClusters(bbox, Math.floor(zoom)).flatMap((feature): MapItem[] => {
        const lngLat = feature.geometry.coordinates as [number, number];
        if ("cluster" in feature.properties && feature.properties.cluster) {
          return [{ type: "cluster", id: feature.properties.cluster_id, count: feature.properties.point_count, lngLat }];
        }
        const marker = byId.get((feature.properties as MarkerProps).markerId);
        return marker ? [{ type: "marker", marker, lngLat }] : [];
      });
    },
    /** Zoom level at which a cluster splits apart. */
    getExpansionZoom(clusterId: number) {
      return index.getClusterExpansionZoom(clusterId);
    },
  };
}
