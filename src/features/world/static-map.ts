import { GTA_MAP_TILES_URL, GTA_TILE_ZOOM } from "./gta-map-config";
import type { WorldCoordinate } from "./types";

/*
 * Static map snippets: the GTA VI tiles around a point, laid out as plain
 * images. For small previews (analysis results, discovery pages) where a map
 * engine would be overkill. Uses the same projection as the World Explorer:
 * at MapLibre zoom z, one tile spans 2^(25-z) game metres, and tile indices
 * run from the game origin at 2^(z-1).
 */

export type SnippetTile = { src: string; left: number; top: number; width: number; height: number };

export type Snippet = {
  tiles: SnippetTile[];
  /** Width ÷ height of the snippet. */
  aspect: number;
  /** Where the point sits, in % of the snippet (always the centre). */
  point: { left: number; top: number };
};

/**
 * Tiles covering `width` metres around `center`, at the sharpest zoom that
 * still fits in about `maxTiles` tiles. Positions are % of the snippet box.
 */
export function staticMapSnippet(center: WorldCoordinate, { width = 900, aspect = 16 / 9, maxTiles = 4 } = {}): Snippet {
  const height = width / aspect;
  let zoom: number = GTA_TILE_ZOOM.max;
  // Back off a zoom level while the box would need more than maxTiles tiles across.
  while (zoom > GTA_TILE_ZOOM.min && width / 2 ** (25 - zoom) > maxTiles - 1) zoom -= 1;
  const tileMetres = 2 ** (25 - zoom);
  const half = 2 ** (zoom - 1);
  const west = center.x - width / 2;
  const north = center.y + height / 2;
  const firstX = Math.floor(west / tileMetres);
  const lastX = Math.floor((west + width) / tileMetres);
  const firstY = Math.floor(-north / tileMetres);
  const lastY = Math.floor((-(north - height)) / tileMetres);

  const tiles: SnippetTile[] = [];
  for (let tx = firstX; tx <= lastX; tx++) {
    for (let ty = firstY; ty <= lastY; ty++) {
      tiles.push({
        src: `${GTA_MAP_TILES_URL}/${zoom}/${tx + half}/${ty + half}.jpg`,
        left: ((tx * tileMetres - west) / width) * 100,
        top: ((ty * tileMetres + north) / height) * 100,
        width: (tileMetres / width) * 100,
        height: (tileMetres / height) * 100,
      });
    }
  }
  return { tiles, aspect, point: { left: 50, top: 50 } };
}
