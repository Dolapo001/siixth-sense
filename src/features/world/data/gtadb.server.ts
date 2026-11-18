/*
 * Server-only: turns the pinned gtadb.org GTA VI landmark snapshot
 * (gtadb-snapshot.json, written by `pnpm map:sync`) into the World Explorer's
 * types. Interim stand-in for the Sixth Sense backend; served by /api/world/*.
 *
 * Nothing here invents geography: areas and their extents come from the
 * landmarks' own addresses and positions. Records stay "awaiting verification"
 * because Sixth Sense hasn't verified them, and precision is "approximate"
 * because community placements aren't confirmed against the released game.
 */

import { GTA_TILE_BOUNDS } from "../gta-map-config";
import type { DataSource, LocationDetail, Region, WorldBounds, WorldMarker } from "../types";
import snapshot from "./gtadb-snapshot.json";

type SnapshotLandmark = {
  id: string;
  name: string | null;
  area: string[];
  x: number | null;
  y: number | null;
  tags: string[];
  realWorld: string | null;
};

const landmarks = snapshot.landmarks as SnapshotLandmark[];

export const gtadbSource: DataSource = {
  name: "gtadb.org (GTA VI Landmarks Data)",
  url: snapshot.source.url,
  license: snapshot.source.license,
  licenseUrl: snapshot.source.licenseUrl,
  note: "Community-mapped and unofficial until checked against the released game. Names and positions may change.",
};

/** The six official destinations lead the region list, in this order, when the data has them. */
const DESTINATIONS = ["Vice City", "Leonida Keys", "Grassrivers", "Port Gellhorn", "Ambrosia", "Mount Kalaga National Park"];

/** Status tags describe the record, not the kind of place. */
const STATUS_TAGS = new Set(["unconfirmed", "demolished", "closed", "reused", "enterable"]);

/** "Leonida" is the whole state, not an area within it. */
const STATE = "Leonida";

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const broadestArea = (landmark: SnapshotLandmark) => {
  const area = landmark.area.at(-1);
  return area && area !== STATE ? area : null;
};

function kindOf(landmark: SnapshotLandmark) {
  return landmark.tags.find((tag) => !STATUS_TAGS.has(tag)) ?? "landmark";
}

function titleOf(landmark: SnapshotLandmark) {
  if (landmark.name) return landmark.name;
  const kind = kindOf(landmark);
  return `Unnamed ${kind}${landmark.area[0] ? ` · ${landmark.area[0]}` : ""}`;
}

/** Areas with enough placed landmarks to frame on the map; extents come from the landmarks themselves. */
function buildRegions(): Region[] {
  const groups = new Map<string, SnapshotLandmark[]>();
  for (const landmark of landmarks) {
    const area = broadestArea(landmark);
    if (!area || landmark.x === null || landmark.y === null) continue;
    groups.set(area, [...(groups.get(area) ?? []), landmark]);
  }
  const regions = [...groups.entries()]
    .filter(([, members]) => members.length >= 3)
    .map(([name, members]) => {
      const xs = members.map((m) => m.x!);
      const ys = members.map((m) => m.y!);
      // At least 600 m across, so a cluster of three points still frames sensibly.
      const pad = (min: number, max: number) => Math.max(0, (600 - (max - min)) / 2) + 150;
      const px = pad(Math.min(...xs), Math.max(...xs));
      const py = pad(Math.min(...ys), Math.max(...ys));
      const bounds: WorldBounds = {
        minX: Math.min(...xs) - px,
        maxX: Math.max(...xs) + px,
        minY: Math.min(...ys) - py,
        maxY: Math.max(...ys) + py,
      };
      return { id: slug(name), name, bounds, count: members.length };
    });
  const rank = (name: string) => {
    const index = DESTINATIONS.indexOf(name);
    return index === -1 ? DESTINATIONS.length : index;
  };
  return regions
    .sort((a, b) => rank(a.name) - rank(b.name) || b.count - a.count)
    .map(({ id, name, bounds }) => ({ id, name, bounds }));
}

const regions = buildRegions();
const regionIds = new Set(regions.map((r) => r.id));

function regionIdOf(landmark: SnapshotLandmark) {
  const area = broadestArea(landmark);
  const id = area ? slug(area) : null;
  return id && regionIds.has(id) ? id : null;
}

function coordinateOf(landmark: SnapshotLandmark) {
  return landmark.x === null || landmark.y === null ? null : { x: landmark.x, y: landmark.y };
}

const markers: WorldMarker[] = landmarks.map((landmark) => {
  const coordinate = coordinateOf(landmark);
  return {
    id: landmark.id,
    locationId: landmark.id,
    title: titleOf(landmark),
    category: "location",
    precision: coordinate ? "approximate" : "unknown",
    coordinate,
    regionId: regionIdOf(landmark),
    verification: "awaiting_verification",
  };
});

const byId = new Map(landmarks.map((landmark) => [landmark.id, landmark]));

export function getWorldOverview() {
  return { bounds: GTA_TILE_BOUNDS, regions, markers };
}

export function getLocationDetail(id: string): LocationDetail | null {
  const landmark = byId.get(id);
  if (!landmark) return null;
  const kind = kindOf(landmark);
  const where = landmark.area.length ? ` in ${landmark.area.join(", ")}` : "";
  const status = landmark.tags.includes("unconfirmed")
    ? " The mapping community hasn't confirmed this one yet."
    : landmark.tags.includes("demolished")
      ? " Recorded as demolished."
      : landmark.tags.includes("closed")
        ? " Recorded as closed."
        : "";
  return {
    id: landmark.id,
    name: titleOf(landmark),
    regionId: regionIdOf(landmark),
    description: `${kind[0].toUpperCase()}${kind.slice(1)}${where}.${status}`,
    precision: coordinateOf(landmark) ? "approximate" : "unknown",
    coordinate: coordinateOf(landmark),
    verification: "awaiting_verification",
    // Sixth Sense has no discoveries or activity here yet; never fabricated.
    discoveries: [],
    relatedEntities: [],
    activity: { discoveries: 0, contributors: 0, lastActivityAt: null },
    screenshots: [],
    areas: landmark.area,
    tags: landmark.tags,
    realWorldCounterpart: landmark.realWorld,
    source: gtadbSource,
  };
}
