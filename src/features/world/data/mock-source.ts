/*
 * ⚠ DEVELOPMENT SAMPLE DATA — NOT REAL GTA VI DATA.
 *
 * Generated, deterministic placeholder content so the World Explorer can be
 * built and tested before the backend exists. Names are deliberately generic
 * and the coordinate space is arbitrary. Never shown in production unless
 * NEXT_PUBLIC_ENABLE_DEV_MOCKS=true, and always labelled "Sample data" in the UI.
 */

import { verificationStatuses, type LocationPrecision, type VerificationStatus } from "@/types/intelligence";
import {
  discoveryCategories,
  type DiscoverySummary,
  type LocationDetail,
  type Region,
  type WorldBounds,
  type WorldMarker,
} from "../types";
import type { WorldDataSource } from "./source";

const WORLD: WorldBounds = { minX: 0, minY: 0, maxX: 10_000, maxY: 10_000 };

const REGIONS: Region[] = [
  { id: "sample-north", name: "Sample Region North", bounds: { minX: 0, minY: 5_000, maxX: 10_000, maxY: 10_000 } },
  { id: "sample-southwest", name: "Sample Region Southwest", bounds: { minX: 0, minY: 0, maxX: 5_000, maxY: 5_000 } },
  { id: "sample-southeast", name: "Sample Region Southeast", bounds: { minX: 5_000, minY: 0, maxX: 10_000, maxY: 5_000 } },
];

/** Small deterministic PRNG so sample data is stable across reloads and tests. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickPrecision(n: number): LocationPrecision {
  if (n < 0.6) return "confirmed";
  if (n < 0.85) return "approximate";
  if (n < 0.95) return "region";
  return "unknown";
}

function regionFor(x: number, y: number) {
  return REGIONS.find((r) => x >= r.bounds.minX && x <= r.bounds.maxX && y >= r.bounds.minY && y <= r.bounds.maxY)!;
}

function buildSampleData() {
  const random = mulberry32(42);
  const markers: WorldMarker[] = [];
  const locations = new Map<string, LocationDetail>();

  for (let i = 1; i <= 64; i++) {
    const id = `sample-${String(i).padStart(2, "0")}`;
    const category = discoveryCategories[Math.floor(random() * discoveryCategories.length)];
    const precision = pickPrecision(random());
    // Clustered around a few hotspots so marker clustering has something to do.
    const hotspot = [
      { x: 2_500, y: 7_500 },
      { x: 7_000, y: 6_500 },
      { x: 3_000, y: 2_500 },
      { x: 7_500, y: 2_000 },
    ][i % 4];
    const x = Math.min(WORLD.maxX, Math.max(WORLD.minX, hotspot.x + (random() - 0.5) * 3_000));
    const y = Math.min(WORLD.maxY, Math.max(WORLD.minY, hotspot.y + (random() - 0.5) * 3_000));
    const region = regionFor(x, y);
    const verification: VerificationStatus = verificationStatuses[Math.floor(random() * verificationStatuses.length)];
    const hasCoordinate = precision === "confirmed" || precision === "approximate";
    const radius = precision === "approximate" ? 150 + Math.round(random() * 350) : undefined;
    const title = `Sample Location ${String(i).padStart(2, "0")}`;

    markers.push({
      id,
      locationId: id,
      title,
      category,
      precision,
      coordinate: hasCoordinate ? { x, y } : null,
      radius,
      regionId: precision === "unknown" ? null : region.id,
      verification,
    });

    const discoveryCount = Math.floor(random() * 4);
    const discoveries: DiscoverySummary[] = Array.from({ length: discoveryCount }, (_, d) => ({
      id: `${id}-d${d + 1}`,
      title: `Sample discovery ${String(i).padStart(2, "0")}.${d + 1}`,
      category: discoveryCategories[Math.floor(random() * discoveryCategories.length)],
      verification: verificationStatuses[Math.floor(random() * verificationStatuses.length)],
      submittedAt: new Date(Date.UTC(2026, 10, 1 + ((i + d) % 16), 12)).toISOString(),
    }));

    locations.set(id, {
      id,
      name: title,
      regionId: precision === "unknown" ? null : region.id,
      description: "Placeholder description for development. This is sample data, not a real game location.",
      precision,
      coordinate: hasCoordinate ? { x, y } : null,
      radius,
      verification,
      discoveries,
      relatedEntities: discoveries.slice(0, 2).map((d, n) => ({
        id: `${id}-e${n + 1}`,
        name: `Sample entity ${n + 1}`,
        category: d.category,
      })),
      activity: {
        discoveries: discoveryCount,
        contributors: discoveryCount === 0 ? 0 : 1 + Math.floor(random() * 3),
        lastActivityAt: discoveries[0]?.submittedAt ?? null,
      },
      screenshots: [],
    });
  }

  return { markers, locations };
}

const sample = buildSampleData();

/** Raw sample world, shared by other dev mocks (discoveries, analysis) so their links resolve. */
export function getSampleWorld() {
  return { world: WORLD, regions: REGIONS, markers: sample.markers, locations: sample.locations };
}

/** Simulated network delay so loading states are exercised during development. */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockWorldSource(): WorldDataSource {
  return {
    kind: "sample",
    async getWorldBounds() {
      return WORLD;
    },
    async listRegions() {
      await delay();
      return REGIONS;
    },
    async listMarkers() {
      await delay();
      return sample.markers;
    },
    async getLocation(id) {
      await delay();
      return sample.locations.get(id) ?? null;
    },
  };
}
