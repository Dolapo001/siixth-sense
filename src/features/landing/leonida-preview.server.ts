/*
 * Server-only data for the landing page's Leonida preview: a handful of real
 * landmarks from the GTA VI community snapshot, and the map tiles to lay out
 * underneath them. Computed at build time; the page stays static.
 */

import { getLocationDetail, getWorldOverview } from "@/features/world/data/gtadb.server";
import { LEONIDA_ASPECT, leonidaPosition, leonidaTiles, type MosaicTile } from "@/features/world/leonida-mosaic";
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

export type PreviewTile = MosaicTile;

/** Width ÷ height of Leonida, for the preview's aspect ratio. */
export const PREVIEW_ASPECT = LEONIDA_ASPECT;

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
        ...leonidaPosition(marker.coordinate.x, marker.coordinate.y),
      },
    ];
  });
}

/** Tiles covering Leonida (see leonida-mosaic.ts). */
export function getPreviewTiles(): PreviewTile[] {
  return leonidaTiles();
}
