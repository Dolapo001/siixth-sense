/*
 * GTA VI map projection — shared by the World Explorer and
 * scripts/sync-gta-map.mjs, so tiles and markers can never disagree.
 * Must stay dependency-free (Node runs it directly).
 *
 * Game coordinates are metres on the gtadb.org grid: x east, y north, origin
 * (0, 0). gtadb's tile pyramid is a 32,768 px square at 1 px per metre with
 * that origin at its centre, and zoom z is 1024·2^z px wide.
 *
 * MapLibre only draws Web Mercator, so the pyramid is placed on a small patch
 * of it centred on lng/lat (0, 0): gtadb zoom z becomes MapLibre zoom z + 12,
 * and tile indices are shifted to centre it. The patch spans ~0.35°, where
 * Mercator's distortion is negligible; nothing here is real geography.
 */

/** gtadb zoom z ↔ MapLibre zoom z + ZOOM_OFFSET. */
export const GTA_ZOOM_OFFSET = 12;

/** gtadb publishes zoom 0–5 (1 px per metre at 5). */
export const GTA_NATIVE_MIN_ZOOM = GTA_ZOOM_OFFSET;
export const GTA_NATIVE_MAX_ZOOM = 5 + GTA_ZOOM_OFFSET;

/** Half the Web Mercator world in metres of game space (2^24): game x = ±2^24 ↔ lng ±180. */
const HALF_WORLD = 2 ** 24;

/** Game metres → [lng, lat]. */
export function gameToLngLat(x: number, y: number): [number, number] {
  const lng = (x / HALF_WORLD) * 180;
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((Math.PI * y) / HALF_WORLD)) - Math.PI / 2);
  return [lng, lat];
}

/** [lng, lat] → game metres. */
export function lngLatToGame(lng: number, lat: number): { x: number; y: number } {
  const x = (lng / 180) * HALF_WORLD;
  const y = (HALF_WORLD / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return { x, y };
}

/**
 * gtadb tile (z, x, y) → MapLibre tile (z, x, y). gtadb has 4·2^z tiles per
 * axis at zoom z; they're centred in MapLibre's 2^(z+12) tiles per axis.
 */
export function gtadbTileToMapLibre(z: number, x: number, y: number) {
  const zoom = z + GTA_ZOOM_OFFSET;
  const offset = 2 ** (zoom - 1) - 2 * 2 ** z;
  return { z: zoom, x: x + offset, y: y + offset };
}
