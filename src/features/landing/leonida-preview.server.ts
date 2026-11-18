/*
 * Server-only data for the landing page's Leonida preview: a handful of real
 * landmarks from the GTA VI community snapshot, and the map tiles to lay out
 * underneath them. Computed at build time; the page stays static.
 */

import { getLocationDetail, getWorldOverview } from "@/features/world/data/gtadb.server";
import { GTA_MAP_TILES_URL, GTA_TILE_BOUNDS } from "@/features/world/gta-map-config";
import { gtadbTileToMapLibre } from "@/features/world/gta-projection";
import type { WorldLayerId } from "@/features/world/layers";

/**
 * Hand-picked records (by gtadb id) spread across Leonida and its layers.
 * Only the choice is curated; every detail comes from the data, and ids that
 * leave the data are simply dropped.
 */
const FEATURED_IDS = [
  "L1", // Vice Regal, Vice Beach
  "L36", // Ocean View Hotel, Ocean Beach
  "L221", // Heath Tower, Downtown Vice City
  "L163", // Evergreen Mall, Waning Sands
  "L456", // Vice City sign, VCIA
  "L345", // VCIA control tower
  "L634", // Vice River
  "L317", // Bocamar Bridge, Port Gellhorn
  "L527", // Prison, Kelly County
  "L530", // Mount Kalaga
  "L1000", // Lake Leonida
  "L326", // Brian's Boat Works & Marina, Key Lento
  "L447", // Underwater research station, Mariana County
  "L1068", // Bobcat Key
];

export type PreviewPlace = {
  id: string;
  title: string;
  layer: WorldLayerId;
  areas: string[];
  realWorld: string | null;
  /** Position within the preview, as a percentage of its width and height. */
  left: number;
  top: number;
};

export type PreviewTile = { src: string; left: number; top: number; width: number; height: number };

const bounds = GTA_TILE_BOUNDS;
const spanX = bounds.maxX - bounds.minX;
const spanY = bounds.maxY - bounds.minY;
const leftOf = (x: number) => ((x - bounds.minX) / spanX) * 100;
const topOf = (y: number) => ((bounds.maxY - y) / spanY) * 100;

/** Width ÷ height of Leonida, for the preview's aspect ratio. */
export const PREVIEW_ASPECT = spanX / spanY;

export function getPreviewPlaces(): PreviewPlace[] {
  const markers = new Map(getWorldOverview().markers.map((marker) => [marker.id, marker]));
  return FEATURED_IDS.flatMap((id) => {
    const marker = markers.get(id);
    const detail = getLocationDetail(id);
    if (!marker?.coordinate || !detail) return [];
    return [
      {
        id,
        title: marker.title,
        layer: marker.layer ?? "other",
        areas: detail.areas ?? [],
        realWorld: detail.realWorldCounterpart ?? null,
        left: leftOf(marker.coordinate.x),
        top: topOf(marker.coordinate.y),
      },
    ];
  });
}

/**
 * gtadb zoom-1 tiles (4,096 m each, MapLibre zoom 13) covering Leonida, as
 * percentages of the preview box. Tiles overhanging the edge are clipped by
 * the box, which keeps the tile art's legend panel out of view.
 */
export function getPreviewTiles(): PreviewTile[] {
  const z = 1;
  const metres = 32_768 / (4 * 2 ** z);
  const tiles: PreviewTile[] = [];
  for (let x = 0; x < 4 * 2 ** z; x++) {
    for (let y = 0; y < 4 * 2 ** z; y++) {
      const west = x * metres - 16_384;
      const north = 16_384 - y * metres;
      if (west >= bounds.maxX || west + metres <= bounds.minX) continue;
      if (north <= bounds.minY || north - metres >= bounds.maxY) continue;
      const t = gtadbTileToMapLibre(z, x, y);
      tiles.push({
        src: `${GTA_MAP_TILES_URL}/${t.z}/${t.x}/${t.y}.jpg`,
        left: leftOf(west),
        top: topOf(north),
        width: (metres / spanX) * 100,
        height: (metres / spanY) * 100,
      });
    }
  }
  return tiles;
}
