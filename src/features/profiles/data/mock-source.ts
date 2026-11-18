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
import type { Achievement, ContributionStats, LeaderboardEntry, LeaderboardPeriod } from "../types";
import type { ProfileDataSource } from "./source";

const DAY = 86_400_000;
const periodStart: Record<LeaderboardPeriod, (now: number) => number> = {
  week: (now) => now - 7 * DAY,
  month: (now) => now - 30 * DAY,
  all: () => 0,
};

/** SAMPLE reputation formula. Verified work counts most; rejected work counts against. */
export function sampleReputation(stats: ContributionStats, rejected: number) {
  return Math.max(0, stats.verified * 10 + stats.reviews * 3 + stats.comments - rejected * 5);
}

type Totals = ContributionStats & { rejected: number; regions: Set<string>; firstVerifiedAt: string | null };

function emptyTotals(): Totals {
  return { submitted: 0, verified: 0, reviews: 0, comments: 0, rejected: 0, regions: new Set(), firstVerifiedAt: null };
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
  if (totals.regions.size >= 3) {
    list.push({ id: "explorer", name: "Explorer", description: "Found discoveries in 3 regions.", earnedAt: joinedAt });
  }
  return list;
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockProfileSource(now: () => number = Date.now): ProfileDataSource {
  return {
    kind: "sample",

    async getProfile(username) {
      await delay();
      const { contributors } = getSampleCommunitySnapshot();
      const session = await getSession();
      const person =
        contributors.find((c) => c.username === username) ??
        (session?.user.username === username ? session.user : undefined);
      if (!person) return null;

      const totals = tally(0).get(username) ?? emptyTotals();
      const index = contributors.findIndex((c) => c.username === username);
      const joinedAt = new Date(Date.UTC(2026, 9, 1 + Math.max(index, 0) * 3)).toISOString();
      const stats: ContributionStats = {
        submitted: totals.submitted,
        verified: totals.verified,
        reviews: totals.reviews,
        comments: totals.comments,
      };
      return {
        username: person.username,
        displayName: person.displayName,
        bio: index >= 0 ? "Sample contributor profile for development." : null,
        joinedAt,
        avatarUrl: null,
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
        regionsExplored: totals.regions.size,
      };
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
        return { ...row, rank };
      });
      return { dimension, period, entries, supportedPeriods: ["week", "month", "all"] };
    },
  };
}
