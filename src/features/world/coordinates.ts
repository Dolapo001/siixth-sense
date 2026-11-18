import { gameToLngLat, lngLatToGame } from "./gta-projection";
import type { WorldBounds, WorldCoordinate } from "./types";

/*
 * Game-world ↔ map coordinates. World coordinates are GTA VI game metres on
 * the gtadb.org grid (x east, y north). The projection onto MapLibre's lng/lat
 * lives in gta-projection.ts, shared with the tile sync script so markers and
 * tiles always line up. Nothing here is real-world geography.
 */

/** World coordinate → [lng, lat]. Larger y is further north. */
export function worldToLngLat(point: WorldCoordinate): [number, number] {
  return gameToLngLat(point.x, point.y);
}

export function lngLatToWorld([lng, lat]: [number, number]): WorldCoordinate {
  return lngLatToGame(lng, lat);
}

/** World bounds → [[west, south], [east, north]] for fitBounds / maxBounds. */
export function boundsToLngLatBounds(bounds: WorldBounds): [[number, number], [number, number]] {
  return [worldToLngLat({ x: bounds.minX, y: bounds.minY }), worldToLngLat({ x: bounds.maxX, y: bounds.maxY })];
}

/** Grows bounds by a fraction of their size on every side. */
export function padBounds(bounds: WorldBounds, fraction: number): WorldBounds {
  const dx = (bounds.maxX - bounds.minX) * fraction;
  const dy = (bounds.maxY - bounds.minY) * fraction;
  return { minX: bounds.minX - dx, minY: bounds.minY - dy, maxX: bounds.maxX + dx, maxY: bounds.maxY + dy };
}

/** Formats a coordinate for display, e.g. "X 1,204 · Y 3,880". */
export function formatCoordinate({ x, y }: WorldCoordinate) {
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  return `X ${fmt(x)} · Y ${fmt(y)}`;
}

/** GeoJSON grid lines every `step` world units, for the placeholder base layer. */
export function gridLines(bounds: WorldBounds, step: number) {
  const features: GeoJSON.Feature<GeoJSON.LineString, { major: boolean }>[] = [];
  const startX = Math.ceil(bounds.minX / step) * step;
  const startY = Math.ceil(bounds.minY / step) * step;
  for (let x = startX; x <= bounds.maxX; x += step) {
    features.push({
      type: "Feature",
      properties: { major: x % (step * 5) === 0 },
      geometry: {
        type: "LineString",
        coordinates: [worldToLngLat({ x, y: bounds.minY }), worldToLngLat({ x, y: bounds.maxY })],
      },
    });
  }
  for (let y = startY; y <= bounds.maxY; y += step) {
    features.push({
      type: "Feature",
      properties: { major: y % (step * 5) === 0 },
      geometry: {
        type: "LineString",
        coordinates: [worldToLngLat({ x: bounds.minX, y }), worldToLngLat({ x: bounds.maxX, y })],
      },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

/** Keeps the fitted world clear of the floating toolbar (top) and controls (bottom). */
export const WORLD_FIT_PADDING = { top: 120, bottom: 64, left: 48, right: 48 };
