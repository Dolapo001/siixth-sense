import { GTA_NATIVE_MAX_ZOOM, GTA_NATIVE_MIN_ZOOM } from "./gta-projection";
import type { WorldBounds } from "./types";

/*
 * The GTA VI base map: community tiles from gtadb.org (CC BY 4.0), self-hosted.
 * `pnpm map:sync` puts them in public/tiles/gta6 for development; production
 * reads them from object storage via NEXT_PUBLIC_MAP_TILES_URL (`pnpm map:sync --upload`).
 */

export const GTA_MAP_TILES_URL = (process.env.NEXT_PUBLIC_MAP_TILES_URL || "/tiles/gta6").replace(/\/$/, "");

/** Area the tile set covers, in game metres (from its zoom-5 tile range). */
export const GTA_TILE_BOUNDS: WorldBounds = { minX: -11_008, minY: -9_216, maxX: 10_240, maxY: 11_008 };

export const GTA_TILE_ZOOM = { min: GTA_NATIVE_MIN_ZOOM, max: GTA_NATIVE_MAX_ZOOM };

/** Required by the licence; shown in the map's attribution control. */
export const GTA_MAP_ATTRIBUTION =
  '<a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer">GTA VI Map Tiles</a> ' +
  '(<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>) — ' +
  "gtadb.org, base art YANIS v18 by the GTA VI mapping community. Unofficial; re-indexed for this map.";
