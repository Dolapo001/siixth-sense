/*
 * Frontend vocabulary for trust and precision states.
 * The backend contract isn't available yet (see docs/phase-1-assessment.md).
 * When it is, map backend values onto these in lib/api rather than renaming them across the UI.
 */

export const verificationStatuses = [
  "ai_suggested",
  "awaiting_verification",
  "verified",
  "disputed",
  "rejected",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const confidenceLevels = ["high", "moderate", "low"] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const locationPrecisions = ["confirmed", "approximate", "region", "unknown"] as const;
export type LocationPrecision = (typeof locationPrecisions)[number];
