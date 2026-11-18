/*
 * ⚠ DEVELOPMENT SAMPLE DATA. Shared by the profile and discovery mocks so a
 * profile edit (name, avatar) shows everywhere: profile, leaderboard, feed,
 * discovery pages, comments. Kept free of other mock imports to avoid cycles.
 */

import { avatarPresets, type AvatarPresetId } from "@/components/profiles/avatar-presets";
import type { ProfileUpdate } from "../types";

/** Profile edits made in this browser session, by account (the original username / wallet). */
export const profileEdits = new Map<string, ProfileUpdate>();

/** The account behind a username, following any rename. */
export function accountFor(username: string) {
  for (const [account, edits] of profileEdits) if (edits.username === username) return account;
  return username;
}

/** Sample contributors get a stable preset avatar so lists look lived-in; real players start with initials. */
export function sampleAvatarFor(username: string): AvatarPresetId | null {
  if (!username.startsWith("sample_user_")) return null;
  let h = 0;
  for (const char of username) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPresets[h % avatarPresets.length].id;
}

/** A contributor as everyone currently sees them: edited name and avatar applied. */
export function presentContributor<T extends { username: string; displayName: string }>(
  contributor: T,
): T & { avatarId: AvatarPresetId | null } {
  const edits = profileEdits.get(contributor.username);
  return {
    ...contributor,
    username: edits?.username ?? contributor.username,
    displayName: edits?.displayName ?? contributor.displayName,
    avatarId: edits ? edits.avatarId : sampleAvatarFor(contributor.username),
  };
}
