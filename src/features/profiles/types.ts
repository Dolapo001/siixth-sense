/*
 * Profile and leaderboard types. Frontend shape only until the backend
 * contract exists.
 */

export type ContributionStats = {
  /** Everything the contributor has shared, verified or not. */
  submitted: number;
  /** Shared discoveries the community has verified. */
  verified: number;
  /** Times they confirmed or disputed someone else's discovery. */
  reviews: number;
  comments: number;
};

export type Achievement = { id: string; name: string; description: string; earnedAt: string };

export type Profile = {
  username: string;
  displayName: string;
  bio: string | null;
  joinedAt: string;
  avatarUrl: string | null;
  reputation: number;
  stats: ContributionStats;
  achievements: Achievement[];
  /** Optional. `verified` is true only after the wallet signature flow completed. */
  wallet: { address: string; network: string; verified: boolean } | null;
  /** Number of regions with at least one of their discoveries. */
  regionsExplored: number;
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
