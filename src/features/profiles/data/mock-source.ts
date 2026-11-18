/*
 * ⚠ DEVELOPMENT SAMPLE DATA — NOT REAL PROFILES.
 *
 * Computed from the discovery sample data so stats agree across the feed,
 * profiles and leaderboard. The reputation formula below is a placeholder;
 * the real one belongs to the backend.
 */

import { getSession } from "@/features/authentication/session";
import { getSampleCommunitySnapshot } from "@/features/discoveries/data/mock-source";
import { getSampleLinkedWallet } from "@/features/web3/data/mock-source";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import { profileSchema, usernameSchema } from "../schemas";
import { accountFor, presentContributor, profileEdits, sampleAvatarFor } from "./sample-identity";
import type {
  Achievement,
  AreaActivity,
  ContributionCounts,
  LeaderboardEntry,
  LeaderboardPeriod,
  Profile,
  ProfileUpdate,
} from "../types";
import type { ProfileDataSource } from "./source";

const DAY = 86_400_000;
const periodStart: Record<LeaderboardPeriod, (now: number) => number> = {
  week: (now) => now - 7 * DAY,
  month: (now) => now - 30 * DAY,
  all: () => 0,
};

/** SAMPLE reputation formula. Verified work counts most; rejected work counts against. */
export function sampleReputation(stats: ContributionCounts, rejected: number) {
  return Math.max(0, stats.verified * 10 + stats.reviews * 3 + stats.comments - rejected * 5);
}

type Totals = ContributionCounts & {
  rejected: number;
  regions: Set<string>;
  areas: Map<string, AreaActivity>;
  byCategory: Profile["byCategory"];
  firstVerifiedAt: string | null;
};

function emptyTotals(): Totals {
  return {
    submitted: 0,
    verified: 0,
    reviews: 0,
    comments: 0,
    rejected: 0,
    regions: new Set(),
    areas: new Map(),
    byCategory: {},
    firstVerifiedAt: null,
  };
}

/** Tallies everyone's activity since `since` (ms). */
function tally(since: number) {
  const { items } = getSampleCommunitySnapshot();
  const totals = new Map<string, Totals>();
  const get = (username: string) => {
    if (!totals.has(username)) totals.set(username, emptyTotals());
    return totals.get(username)!;
  };
  const inPeriod = (iso: string) => new Date(iso).getTime() >= since;

  for (const { item, history, comments } of items) {
    if (inPeriod(item.submittedAt)) {
      const author = get(item.contributor.username);
      author.submitted += 1;
      if (item.verification === "verified") {
        author.verified += 1;
        const at = history.at(-1)!.at;
        if (!author.firstVerifiedAt || at < author.firstVerifiedAt) author.firstVerifiedAt = at;
      }
      if (item.verification === "rejected") author.rejected += 1;
      if (item.location?.regionId) author.regions.add(item.location.regionId);
      const verified = item.verification === "verified" ? 1 : 0;
      const area = item.location?.regionName;
      if (area) {
        const entry = author.areas.get(area) ?? { name: area, discoveries: 0, verified: 0 };
        entry.discoveries += 1;
        entry.verified += verified;
        author.areas.set(area, entry);
      }
      const category = author.byCategory[item.category] ?? { submitted: 0, verified: 0 };
      author.byCategory[item.category] = { submitted: category.submitted + 1, verified: category.verified + verified };
    }
    for (const event of history) {
      if (event.actor.kind === "member" && inPeriod(event.at)) get(event.actor.username).reviews += 1;
    }
    for (const comment of comments) {
      if (inPeriod(comment.at)) get(comment.author.username).comments += 1;
    }
  }
  return totals;
}

function achievementsFor(totals: Totals, joinedAt: string): Achievement[] {
  const list: Achievement[] = [];
  if (totals.firstVerifiedAt) {
    list.push({
      id: "first-verified",
      name: "First verified discovery",
      description: "The community verified one of their discoveries.",
      earnedAt: totals.firstVerifiedAt,
    });
  }
  if (totals.reviews >= 5) {
    list.push({ id: "reviewer", name: "Reviewer", description: "Reviewed 5 or more discoveries.", earnedAt: joinedAt });
  }
  if (totals.areas.size >= 3) {
    list.push({ id: "explorer", name: "Explorer", description: "Made discoveries in 3 areas of Leonida.", earnedAt: joinedAt });
  }
  return list;
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/** Taken when another account currently goes by this name (its original name, or one it renamed to). */
function usernameTaken(username: string, account: string) {
  const { contributors } = getSampleCommunitySnapshot();
  const accounts = new Set([...contributors.map((c) => c.username), ...profileEdits.keys()]);
  for (const other of accounts) {
    if (other === account) continue;
    if ((profileEdits.get(other)?.username ?? other) === username) return true;
  }
  return false;
}

export function createMockProfileSource(now: () => number = Date.now): ProfileDataSource {
  return {
    kind: "sample",

    async getProfile(requested) {
      await delay();
      const { contributors } = getSampleCommunitySnapshot();
      const session = await getSession();
      // A changed username still leads to the same account.
      const username = accountFor(requested);
      const person =
        contributors.find((c) => c.username === username) ??
        (session?.user.username === username ? session.user : undefined);
      if (!person) return null;
      const edits = profileEdits.get(username);

      const totals = tally(0).get(username) ?? emptyTotals();
      const index = contributors.findIndex((c) => c.username === username);
      const joinedAt = new Date(Date.UTC(2026, 9, 1 + Math.max(index, 0) * 3)).toISOString();
      const stats: ContributionCounts = {
        submitted: totals.submitted,
        verified: totals.verified,
        reviews: totals.reviews,
        comments: totals.comments,
      };
      return {
        username: edits?.username ?? person.username,
        displayName: edits?.displayName ?? person.displayName,
        bio: edits ? edits.bio : index >= 0 ? "Sample contributor profile for development." : null,
        joinedAt,
        avatarUrl: null,
        avatarId: edits ? edits.avatarId : sampleAvatarFor(person.username),
        viewerIsOwner: !!session && accountFor(session.user.username) === username,
        reputation: sampleReputation(stats, totals.rejected),
        stats,
        achievements: achievementsFor(totals, joinedAt),
        // The viewer's wallet appears once linked (and verified) on /web3. One sample
        // contributor has a deliberately unverified wallet, to show that state honestly.
        wallet:
          session?.user.username === username
            ? getSampleLinkedWallet()
            : username === "sample_user_2"
            ? {
                address: "SampLe1111111111111111111111111111111111111",
                network: "Solana devnet (sample)",
                verified: false,
              }
            : null,
        regionsExplored: totals.areas.size,
        areas: [...totals.areas.values()].sort((a, b) => b.discoveries - a.discoveries || a.name.localeCompare(b.name)),
        byCategory: totals.byCategory,
      };
    },

    async updateProfile(update) {
      const session = await getSession();
      if (!session) throw new ActionRefusedError("Sign in to edit your profile.");
      await delay();
      const account = accountFor(session.user.username);
      const result = profileSchema.safeParse({ ...update, bio: update.bio ?? "" });
      // A real server refuses with a readable message; do the same.
      if (!result.success) throw new ActionRefusedError(result.error.issues[0]?.message ?? "Check your profile details.");
      const parsed = result.data;
      if (usernameTaken(parsed.username, account)) {
        throw new ActionRefusedError("That username is taken. Try another.");
      }
      profileEdits.set(account, {
        username: parsed.username,
        displayName: parsed.displayName,
        bio: parsed.bio || null,
        avatarId: (parsed.avatarId as ProfileUpdate["avatarId"]) ?? null,
      });
      return (await this.getProfile(parsed.username))!;
    },

    async checkUsername(username) {
      await delay(150);
      const session = await getSession();
      const result = usernameSchema.safeParse(username);
      if (!result.success) return { available: false, reason: result.error.issues[0]?.message };
      const account = session ? accountFor(session.user.username) : "";
      return usernameTaken(result.data, account)
        ? { available: false, reason: "That username is taken." }
        : { available: true };
    },

    async getLeaderboard({ dimension, period }) {
      await delay();
      const { contributors } = getSampleCommunitySnapshot();
      const totals = tally(periodStart[period](now()));
      const rows = contributors.map((c) => {
        const t = totals.get(c.username) ?? emptyTotals();
        return {
          username: c.username,
          displayName: c.displayName,
          verified: t.verified,
          reviews: t.reviews,
          reputation: sampleReputation(t, t.rejected),
        };
      });
      const ranked = rows
        // Contributors with nothing in this period aren't ranked.
        .filter((row) => row[dimension] > 0)
        .sort((a, b) => b[dimension] - a[dimension] || a.displayName.localeCompare(b.displayName));
      // Ties share a rank (1, 2, 2, 4).
      let rank = 0;
      const entries: LeaderboardEntry[] = ranked.map((row, i) => {
        if (i === 0 || ranked[i - 1][dimension] !== row[dimension]) rank = i + 1;
        // Names and avatars as players currently show them.
        return { ...row, ...presentContributor(row), rank };
      });
      return { dimension, period, entries, supportedPeriods: ["week", "month", "all"] };
    },
  };
}
