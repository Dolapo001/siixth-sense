import type { DiscoveryCategory } from "@/features/world/types";
import type { ConfidenceLevel, LocationPrecision, VerificationStatus } from "@/types/intelligence";

/*
 * Screenshot analysis domain types. Frontend shape only; the backend contract
 * isn't available yet, so an API source will map its responses onto these.
 */

/** States reported by the analysis service. Never inferred by the UI. */
export const jobStatuses = ["queued", "processing", "completed", "failed"] as const;
export type JobStatus = (typeof jobStatuses)[number];

/** Box relative to the image: 0–1 on each axis, origin top-left. */
export type BoundingBox = { x: number; y: number; width: number; height: number };

export type Detection = {
  id: string;
  /** Suggested identity, e.g. a vehicle or landmark name. */
  label: string;
  category: DiscoveryCategory;
  /** 0–1 if the service provides a score. */
  confidence?: number;
  /** Level from the service, if it provides one. */
  confidenceLevel?: ConfidenceLevel;
  description?: string;
  verification: VerificationStatus;
  /** Null when the service doesn't say where in the image the entity is. */
  box: BoundingBox | null;
  evidence: string[];
  relatedDiscoveries: { id: string; title: string }[];
  relatedLocations: { id: string; name: string; precision: LocationPrecision }[];
};

export type LocationMatch = {
  locationId: string;
  name: string;
  precision: LocationPrecision;
  confidence?: number;
  /** Why it was suggested, in plain words (e.g. 'Sign reads "SEVEN SEAS SEAFOOD"'). */
  basis?: string;
};

/** Error code for a screenshot the service found isn't from GTA VI: final, and it can't be published. */
export const NOT_GTA = "not_gta";

export type AnalysisJob = {
  id: string;
  status: JobStatus;
  submittedAt: string;
  completedAt?: string;
  /** Present when status is "failed". */
  error?: { code: string; message: string };
  /** Only meaningful when status is "completed". */
  detections: Detection[];
  locationMatches: LocationMatch[];
};

export function isTerminal(status: JobStatus) {
  return status === "completed" || status === "failed";
}
