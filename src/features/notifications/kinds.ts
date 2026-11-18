/*
 * What each notification kind links to, and which kinds can be muted.
 * Kinds and their `data` come from the backend's notify() calls; the kind list
 * is open, so anything unknown still shows, just without a link.
 */

import type { MuteGroup, NotificationLink } from "./types";

type Data = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value ? value : null);

/** The page a notification points at, from the public ids in its data. */
export function linkFor(kind: string, data: Data): NotificationLink | null {
  const discovery = text(data.discovery);
  if (discovery) {
    const href = `/discoveries/${encodeURIComponent(discovery)}`;
    const comment = text(data.comment);
    if (comment) return { href: `${href}#comment-${encodeURIComponent(comment)}`, label: "View comment" };
    return { href, label: "View discovery" };
  }
  const username = text(data.username);
  if (username) return { href: `/profile/${encodeURIComponent(username)}`, label: "View profile" };
  if (text(data.reward)) return { href: "/rewards", label: "View rewards" };
  // No analysis deep link exists yet; the analyze page is still the right place.
  if (text(data.analysis)) return { href: "/analyze", label: "Open Analyze" };

  switch (kind) {
    case "achievement":
    case "role_promoted":
      return { href: "/profile", label: "View profile" };
    case "wallet_connected":
      return { href: "/web3", label: "View wallet" };
    default:
      // Reports and moderator warnings have no player-facing page yet.
      return null;
  }
}

/**
 * Kinds the player may mute, grouped as they'd think of them. Moderation
 * (warnings, report outcomes) is deliberately absent: players shouldn't be
 * able to silence those, even though the backend would accept it.
 */
export const muteGroups: MuteGroup[] = [
  {
    id: "analysis",
    label: "Screenshot analysis",
    description: "When an analysis finishes or fails.",
    kinds: ["analysis_completed", "analysis_failed"],
  },
  {
    id: "discoveries",
    label: "Your discoveries",
    description: "Status changes and identification suggestions on what you've shared.",
    kinds: ["discovery_under_review", "discovery_verified", "discovery_rejected", "discovery_disputed", "suggestion"],
  },
  {
    id: "comments",
    label: "Comments and replies",
    description: "New comments on your discoveries and replies to your comments.",
    kinds: ["comment_received", "reply_received"],
  },
  { id: "followers", label: "New followers", description: "When someone follows you.", kinds: ["follow"] },
  {
    id: "proof",
    label: "Proof of Discovery",
    description: "When a discovery's on-chain proof is confirmed.",
    kinds: ["proof_confirmed"],
  },
  {
    id: "rewards",
    label: "Rewards",
    description: "When a reward is earned, approved, paid or declined.",
    kinds: ["reward_eligible", "reward_rejected", "reward_distributed"],
  },
  {
    id: "milestones",
    label: "Achievements and role",
    description: "Badges you unlock and becoming a Verified Contributor.",
    kinds: ["achievement", "role_promoted"],
  },
  { id: "wallet", label: "Wallet", description: "When a wallet is linked to your account.", kinds: ["wallet_connected"] },
];

/** A group counts as muted only when every kind in it is. */
export function isGroupMuted(group: MuteGroup, muted: readonly string[]) {
  return group.kinds.every((kind) => muted.includes(kind));
}

/** The muted list after switching one group, keeping kinds this screen doesn't know about. */
export function withGroupMuted(muted: readonly string[], group: MuteGroup, mute: boolean): string[] {
  const rest = muted.filter((kind) => !group.kinds.includes(kind));
  return (mute ? [...rest, ...group.kinds] : rest).sort();
}
