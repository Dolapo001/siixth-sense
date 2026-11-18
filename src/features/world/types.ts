import type { LocationPrecision, VerificationStatus } from "@/types/intelligence";
import type { WorldLayerId } from "./layers";

/*
 * World Explorer domain types. These are the frontend's shape; the backend
 * contract isn't available yet, so an API data source will map onto these.
 */

/** A position in Sixth Sense's game-world coordinate system. Never GPS. */
export type WorldCoordinate = { x: number; y: number };

/** Extent of the game-world coordinate system. */
export type WorldBounds = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * What a discovery is about. Frontend vocabulary until the backend publishes
 * its category definitions; map those onto these ids in lib/api. ("event" is
 * shown as "Activity".)
 */
export const discoveryCategories = [
  "location",
  "landmark",
  "vehicle",
  "character",
  "wildlife",
  "collectible",
  "object",
  "event",
  "hidden",
] as const;
export type DiscoveryCategory = (typeof discoveryCategories)[number];

export type Region = {
  id: string;
  name: string;
  bounds: WorldBounds;
};

/**
 * Anything that can appear in the explorer. Only `confirmed` and
 * `approximate` items have a coordinate and get a marker on the map;
 * `region` and `unknown` items are listed instead.
 */
export type WorldMarker = {
  id: string;
  locationId: string;
  title: string;
  category: DiscoveryCategory;
  precision: LocationPrecision;
  coordinate: WorldCoordinate | null;
  /** Uncertainty radius in world units, for approximate coordinates. */
  radius?: number;
  regionId: string | null;
  verification: VerificationStatus;
  /** Map layer (kind of place), when the source classifies it. */
  layer?: WorldLayerId;
  /** Areas it sits in, nearest first. Searchable. */
  areas?: string[];
  /** False when the title is descriptive because the in-game name isn't known yet. */
  nameKnown?: boolean;
};

export type DiscoverySummary = {
  id: string;
  title: string;
  category: DiscoveryCategory;
  verification: VerificationStatus;
  submittedAt: string;
};

export type LocationDetail = {
  id: string;
  name: string;
  regionId: string | null;
  description: string;
  precision: LocationPrecision;
  coordinate: WorldCoordinate | null;
  radius?: number;
  verification: VerificationStatus;
  discoveries: DiscoverySummary[];
  relatedEntities: { id: string; name: string; category: DiscoveryCategory }[];
  activity: { discoveries: number; contributors: number; lastActivityAt: string | null };
  screenshots: { id: string; url: string; alt: string }[];
  /** Areas it sits in, nearest first, e.g. ["Washington Beach", "Vice Beach"]. */
  areas?: string[];
  /** Plain-language kinds, e.g. ["hotel", "enterable"]. */
  tags?: string[];
  /** The real place this one is modelled on, when the source records it. */
  realWorldCounterpart?: string | null;
  /** False when the name is descriptive because the in-game name isn't known yet. */
  nameKnown?: boolean;
  /** Where this record comes from, when it isn't Sixth Sense's own data. Shown with the licence. */
  source?: DataSource;
};

export type DataSource = {
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** e.g. "Community-mapped and unofficial until checked against the released game." */
  note: string;
};

export type MarkerFilter = {
  categories: ReadonlySet<DiscoveryCategory>;
};
