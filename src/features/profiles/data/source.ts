import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { Leaderboard, LeaderboardDimension, LeaderboardPeriod, Profile } from "../types";

/**
 * Profiles and rankings. Reputation and rankings are computed by the
 * backend; the UI only displays them.
 */
export interface ProfileDataSource {
  readonly kind: "sample" | "live";
  getProfile(username: string, signal?: AbortSignal): Promise<Profile | null>;
  getLeaderboard(
    options: { dimension: LeaderboardDimension; period: LeaderboardPeriod },
    signal?: AbortSignal,
  ): Promise<Leaderboard>;
}

export async function getProfileDataSource(): Promise<ProfileDataSource | null> {
  // Phase 5: return the API-backed source when the backend exposes profile endpoints.
  if (devMocksEnabled()) {
    const { createMockProfileSource } = await import("./mock-source");
    return createMockProfileSource();
  }
  return null;
}
