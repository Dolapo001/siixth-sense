import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type {
  Leaderboard,
  LeaderboardDimension,
  LeaderboardPeriod,
  Profile,
  ProfileUpdate,
  UsernameCheck,
} from "../types";

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
  /** The signed-in player's profile changes. Returns the profile as saved. */
  updateProfile(update: ProfileUpdate): Promise<Profile>;
  /** Whether a username is free (the viewer's own current name counts as free). */
  checkUsername(username: string, signal?: AbortSignal): Promise<UsernameCheck>;
}

export async function getProfileDataSource(): Promise<ProfileDataSource | null> {
  // Phase 5: return the API-backed source when the backend exposes profile endpoints.
  if (devMocksEnabled()) {
    const { createMockProfileSource } = await import("./mock-source");
    return createMockProfileSource();
  }
  return null;
}
