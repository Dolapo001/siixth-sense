/*
 * Profiles and the leaderboard from the Sixth Sense backend (items 23–25 of
 * its docs/frontend-requirements-response.md).
 */

import { api, ApiError, type ApiPage } from "@/lib/api/client";
import { avatarIdFromUrl, avatarUrlFor, fromBackendCategory, photoAvatarUrl } from "@/lib/api/mappers";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { Leaderboard, LeaderboardPeriod, Profile } from "../types";
import type { ProfileDataSource } from "./source";

type BackendProfile = {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  joined: string;
  reputation_score: number;
  stats: Profile["stats"] | null;
  regions_explored: number | null;
  achievements: { code: string; name: string; description: string; earned_at: string }[] | null;
  wallet: { address: string; network: string; verified: boolean } | null;
};

type BackendLeaderboard = {
  supported_periods: LeaderboardPeriod[];
  entries: { rank: number; username: string; display_name: string; avatar_url?: string; verified: number; reviews: number; reputation: number }[];
};

/** Discoveries scanned to count a profile's categories. */
const CATEGORY_SAMPLE = 100;

const USERNAME_FIXED = "Usernames can't be changed yet.";

async function categoryCounts(username: string): Promise<Profile["byCategory"]> {
  try {
    const page = await api<ApiPage<{ category: string; tags: string[] | null; verification: string }>>(
      `profiles/${encodeURIComponent(username)}/discoveries/`,
      { query: { page_size: CATEGORY_SAMPLE } },
    );
    const counts: Profile["byCategory"] = {};
    for (const d of page.results) {
      const entry = (counts[fromBackendCategory(d.category, d.tags)] ??= { submitted: 0, verified: 0 });
      entry.submitted++;
      if (d.verification === "verified") entry.verified++;
    }
    return counts;
  } catch {
    // Hidden by the player's privacy settings, or not available: show none rather than fail the profile.
    return {};
  }
}

const currentUsername = async () => (await api<{ username: string }>("auth/me/")).username;

export function createApiProfileSource(): ProfileDataSource {
  async function getProfile(username: string, signal?: AbortSignal): Promise<Profile | null> {
    let p: BackendProfile;
    try {
      p = await api<BackendProfile>(`users/${encodeURIComponent(username)}/`, { signal });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
    return {
      username: p.username,
      displayName: p.display_name || p.username,
      bio: p.bio || null,
      joinedAt: p.joined,
      avatarUrl: photoAvatarUrl(p.avatar_url),
      avatarId: avatarIdFromUrl(p.avatar_url),
      reputation: p.reputation_score,
      stats: p.stats ?? { submitted: 0, verified: 0, reviews: 0, comments: 0 },
      achievements: (p.achievements ?? []).map((a) => ({
        id: a.code,
        name: a.name,
        description: a.description,
        earnedAt: a.earned_at,
      })),
      wallet: p.wallet,
      regionsExplored: p.regions_explored ?? 0,
      // The backend doesn't aggregate discoveries by World map area yet.
      areas: [],
      byCategory: await categoryCounts(p.username),
    };
  }

  return {
    kind: "live",
    getProfile,

    async getLeaderboard({ dimension, period }, signal): Promise<Leaderboard> {
      const board = await api<BackendLeaderboard>("leaderboard/", { query: { dimension, period }, signal });
      return {
        dimension,
        period,
        supportedPeriods: board.supported_periods,
        entries: board.entries.map((e) => ({
          rank: e.rank,
          username: e.username,
          displayName: e.display_name || e.username,
          avatarId: avatarIdFromUrl(e.avatar_url),
          verified: e.verified,
          reviews: e.reviews,
          reputation: e.reputation,
        })),
      };
    },

    async updateProfile(update) {
      const username = await currentUsername();
      if (update.username !== username) throw new ActionRefusedError(USERNAME_FIXED);
      try {
        await api("profiles/me/", {
          method: "PATCH",
          body: {
            profile: {
              display_name: update.displayName,
              bio: update.bio ?? "",
              avatar_url: avatarUrlFor(update.avatarId, window.location.origin),
            },
          },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status < 500) throw new ActionRefusedError(error.message);
        throw error;
      }
      const saved = await getProfile(username);
      if (!saved) throw new Error("The saved profile couldn't be read back.");
      return saved;
    },

    async checkUsername(username) {
      // The backend assigns usernames and has no rename yet; only the current one is "available".
      return username === (await currentUsername()) ? { available: true } : { available: false, reason: USERNAME_FIXED };
    },
  };
}
