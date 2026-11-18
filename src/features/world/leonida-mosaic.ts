import { GTA_MAP_TILES_URL, GTA_TILE_BOUNDS } from "./gta-map-config";
import { gtadbTileToMapLibre } from "./gta-projection";

/*
 * The whole of Leonida as a handful of static tiles (gtadb zoom 1, MapLibre
 * zoom 13), for overview pictures without a map engine: the landing page and
 * profiles. Positions are percentages of a box with Leonida's aspect ratio.
 */

export type MosaicTile = { src: string; left: number; top: number; width: number; height: number };

const bounds = GTA_TILE_BOUNDS;
const spanX = bounds.maxX - bounds.minX;
const spanY = bounds.maxY - bounds.minY;

/** Width ÷ height of Leonida. */
export const LEONIDA_ASPECT = spanX / spanY;

/** A game coordinate as a position in the mosaic, in % of its width and height. */
export function leonidaPosition(x: number, y: number) {
  return { left: ((x - bounds.minX) / spanX) * 100, top: ((bounds.maxY - y) / spanY) * 100 };
}

/** Tiles covering Leonida. Ones overhanging the edge are clipped by the box (keeping the art's legend out). */
export function leonidaTiles(): MosaicTile[] {
  const z = 1;
  const metres = 32_768 / (4 * 2 ** z);
  const tiles: MosaicTile[] = [];
  for (let x = 0; x < 4 * 2 ** z; x++) {
    for (let y = 0; y < 4 * 2 ** z; y++) {
      const west = x * metres - 16_384;
      const north = 16_384 - y * metres;
      if (west >= bounds.maxX || west + metres <= bounds.minX) continue;
      if (north <= bounds.minY || north - metres >= bounds.maxY) continue;
      const t = gtadbTileToMapLibre(z, x, y);
      const { left, top } = leonidaPosition(west, north);
      tiles.push({
        src: `${GTA_MAP_TILES_URL}/${t.z}/${t.x}/${t.y}.jpg`,
        left,
        top,
        width: (metres / spanX) * 100,
        height: (metres / spanY) * 100,
      });
    }
  }
  return tiles;
}
