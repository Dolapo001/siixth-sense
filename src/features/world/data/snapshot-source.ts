import type { LocationDetail, Region, WorldBounds, WorldMarker } from "../types";
import type { WorldDataSource } from "./source";

type Overview = { bounds: WorldBounds; regions: Region[]; markers: WorldMarker[] };

/**
 * Reads the pinned GTA VI community map snapshot through this app's own
 * /api/world routes (never from gtadb.org directly). One overview request
 * feeds bounds, regions and markers.
 */
export function createSnapshotWorldSource(): WorldDataSource {
  let overview: Promise<Overview> | null = null;
  const loadOverview = () => {
    overview ??= fetch("/api/world/overview").then((response) => {
      if (!response.ok) throw new Error(`World overview failed (HTTP ${response.status})`);
      return response.json() as Promise<Overview>;
    });
    // A failed request may be retried.
    overview.catch(() => (overview = null));
    return overview;
  };

  return {
    kind: "snapshot",
    getWorldBounds: async () => (await loadOverview()).bounds,
    listRegions: async () => (await loadOverview()).regions,
    listMarkers: async () => (await loadOverview()).markers,
    async getLocation(id) {
      const response = await fetch(`/api/world/locations/${encodeURIComponent(id)}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Location failed (HTTP ${response.status})`);
      return (await response.json()) as LocationDetail;
    },
  };
}
