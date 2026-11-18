import { GTA_MAP_EXTENT, GTA_NATIVE_MAX_ZOOM, GTA_NATIVE_MIN_ZOOM } from "./gta-projection";
import type { WorldBounds } from "./types";

/*
 * The GTA VI base map: community tiles from gtadb.org (CC BY 4.0), self-hosted.
 * `pnpm map:sync` (also run by `pnpm build`) puts them in public/tiles/gta6, served
 * as static files. NEXT_PUBLIC_MAP_TILES_URL can point elsewhere if they move to a CDN.
 */

export const GTA_MAP_TILES_URL = (process.env.NEXT_PUBLIC_MAP_TILES_URL || "/tiles/gta6").replace(/\/$/, "");

/** Leonida, in game metres. Tiles are only requested here, and everything outside is masked. */
export const GTA_TILE_BOUNDS: WorldBounds = GTA_MAP_EXTENT;

export const GTA_TILE_ZOOM = { min: GTA_NATIVE_MIN_ZOOM, max: GTA_NATIVE_MAX_ZOOM };

/** Required by the licence; shown in the map's attribution control. */
export const GTA_MAP_ATTRIBUTION =
  '<a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer">GTA VI Map Tiles</a> ' +
  '(<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>) — ' +
  "gtadb.org, base art YANIS v18 by the GTA VI mapping community; re-indexed for this map.";
