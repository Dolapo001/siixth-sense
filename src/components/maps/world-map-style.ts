import type { StyleSpecification } from "maplibre-gl";
import { brandColors } from "@/components/brand/colors";
import { boundsToLngLatBounds, gridLines } from "@/features/world/coordinates";
import { GTA_MAP_ATTRIBUTION, GTA_MAP_TILES_URL, GTA_TILE_BOUNDS, GTA_TILE_ZOOM } from "@/features/world/gta-map-config";
import type { WorldBounds } from "@/features/world/types";

/** Grid spacing in world units for the placeholder base layer. */
const GRID_STEP = 500;

/** Base map: GTA VI community tiles, a faint reference grid, and a mask outside Leonida. */
export function worldMapStyle(world: WorldBounds): StyleSpecification {
  const [[west, south], [east, north]] = boundsToLngLatBounds(world);
  return {
    version: 8,
    sources: {
      // GTA VI community map tiles (gtadb.org, CC BY 4.0), self-hosted. See gta-map-config.ts.
      gta: {
        type: "raster",
        tiles: [`${GTA_MAP_TILES_URL}/{z}/{x}/{y}.jpg`],
        tileSize: 256,
        minzoom: GTA_TILE_ZOOM.min,
        maxzoom: GTA_TILE_ZOOM.max,
        bounds: [...boundsToLngLatBounds(GTA_TILE_BOUNDS)].flat() as [number, number, number, number],
        attribution: GTA_MAP_ATTRIBUTION,
      },
      grid: { type: "geojson", data: gridLines(world, GRID_STEP) },
      // Everything outside Leonida, as a polygon with a hole: hides the tile art's legend panel.
      mask: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
                [-1, -1],
              ],
              [
                [west, south],
                [west, north],
                [east, north],
                [east, south],
                [west, south],
              ],
            ],
          },
        },
      },
      edge: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          },
        },
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": brandColors.midnight } },
      {
        id: "gta-base",
        type: "raster",
        source: "gta",
        // Toned down to sit in the dark interface without losing the map's colour.
        paint: { "raster-brightness-max": 0.82, "raster-saturation": -0.15, "raster-fade-duration": 150 },
      },
      { id: "outside-leonida", type: "fill", source: "mask", paint: { "fill-color": brandColors.midnight } },
      {
        id: "grid-minor",
        type: "line",
        source: "grid",
        filter: ["!", ["get", "major"]],
        paint: { "line-color": brandColors.border, "line-width": 0.5, "line-opacity": 0.18 },
      },
      {
        id: "grid-major",
        type: "line",
        source: "grid",
        filter: ["get", "major"],
        paint: { "line-color": brandColors.border, "line-width": 1, "line-opacity": 0.35 },
      },
      {
        id: "world-edge",
        type: "line",
        source: "edge",
        paint: { "line-color": brandColors.muted, "line-width": 1, "line-opacity": 0.5, "line-dasharray": [4, 4] },
      },
    ],
  };
}

