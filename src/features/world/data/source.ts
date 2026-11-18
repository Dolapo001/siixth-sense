import { liveApiEnabled } from "@/lib/api/config";
import type { LocationDetail, Region, WorldBounds, WorldMarker } from "../types";

/**
 * Everything the World Explorer needs from a data provider.
 * Implemented by the dev mock now and by the Sixth Sense API in Phase 5,
 * so the page doesn't change when real data arrives.
 */
export interface WorldDataSource {
  /**
   * Shown in the UI so nobody mistakes sample or third-party data for Sixth Sense's own:
   * sample = dev mock, snapshot = pinned community map data (gtadb.org), live = Sixth Sense API.
   */
  readonly kind: "sample" | "snapshot" | "live";
  getWorldBounds(): Promise<WorldBounds>;
  listRegions(): Promise<Region[]>;
  listMarkers(): Promise<WorldMarker[]>;
  getLocation(id: string): Promise<LocationDetail | null>;
}

export async function getWorldDataSource(): Promise<WorldDataSource | null> {
  // Geography is the pinned GTA VI community map snapshot, served by this app's own /api/world routes.
  // With the backend connected, its discoveries are drawn on top.
  if (liveApiEnabled()) {
    const { createApiWorldSource } = await import("./api-source");
    return createApiWorldSource();
  }
  const { createSnapshotWorldSource } = await import("./snapshot-source");
  return createSnapshotWorldSource();
}
