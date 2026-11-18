import type { AvatarPresetId } from "@/components/profiles/avatar-presets";
import type { DiscoveryCategory } from "@/features/world/types";

/*
 * Profile and leaderboard types. Frontend shape only until the backend
 * contract exists.
 */

export type ContributionCounts = {
  /** Everything the contributor has shared, verified or not. */
  submitted: number;
  /** Shared discoveries the community has verified. */
  verified: number;
  /** Times they confirmed or disputed someone else's discovery. */
  reviews: number;
  comments: number;
};

/** As shown on a profile: null where the player keeps that number private. */
export type ContributionStats = { [K in keyof ContributionCounts]: ContributionCounts[K] | null };

export type AreaActivity = { name: string; discoveries: number; verified: number };

export type Achievement = { id: string; name: string; description: string; earnedAt: string };

export type Profile = {
  username: string;
  displayName: string;
  bio: string | null;
  joinedAt: string;
  avatarUrl: string | null;
  /** One of the original preset avatars; takes precedence over avatarUrl. */
  avatarId: AvatarPresetId | null;
  /** True when this is the signed-in player's own profile. Set by the server. */
  viewerIsOwner?: boolean;
  reputation: number;
  stats: ContributionStats;
  achievements: Achievement[];
  /** Optional. `verified` is true only after the wallet signature flow completed. */
  wallet: { address: string; network: string; verified: boolean } | null;
  /** Number of areas with at least one of their discoveries. */
  regionsExplored: number;
  /**
   * Where in Leonida they've made discoveries: area names as the World map
   * uses them (e.g. "Vice Beach"), most discoveries first. Aggregated by the
   * server across all their discoveries, not just one page.
   */
  areas: AreaActivity[];
  /** Their submitted discoveries by category, with how many were verified. */
  byCategory: Partial<Record<DiscoveryCategory, { submitted: number; verified: number }>>;
};

export const leaderboardDimensions = [
  { value: "verified", label: "Verified discoveries", short: "Verified" },
  { value: "reviews", label: "Verification activity", short: "Reviews" },
  { value: "reputation", label: "Reputation", short: "Reputation" },
] as const;
export type LeaderboardDimension = (typeof leaderboardDimensions)[number]["value"];

export const leaderboardPeriods = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
] as const;
export type LeaderboardPeriod = (typeof leaderboardPeriods)[number]["value"];

export type LeaderboardEntry = {
  rank: number;
  username: string;
  displayName: string;
  avatarId?: AvatarPresetId | null;
  verified: number;
  reviews: number;
  reputation: number;
};

export type Leaderboard = {
  dimension: LeaderboardDimension;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  /** Periods the backend can rank by. */
  supportedPeriods: LeaderboardPeriod[];
};

/** What a player can change about their profile (PATCH /me/profile). */
export type ProfileUpdate = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarId: AvatarPresetId | null;
};

export type UsernameCheck = { available: boolean; reason?: string };
