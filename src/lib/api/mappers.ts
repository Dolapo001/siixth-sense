/*
 * Backend vocabulary -> frontend vocabulary. The backend's values are
 * documented in its docs/frontend-requirements-response.md; the UI keeps its
 * own names (src/types/intelligence.ts) and everything is translated here.
 */

import { isAvatarPresetId, type AvatarPresetId } from "@/components/profiles/avatar-presets";
import type { Contributor, Page } from "@/features/discoveries/types";
import { discoveryCategories, type DiscoveryCategory } from "@/features/world/types";
import type { ConfidenceLevel, LocationPrecision, VerificationStatus } from "@/types/intelligence";
import type { ApiPage } from "./client";

/** The backend's entity/discovery categories. */
export type BackendCategory = "location" | "vehicle" | "character" | "wildlife" | "object" | "event" | "hidden";

/**
 * The UI has two categories the backend doesn't: landmarks are locations and
 * collectibles are objects there. The original choice travels as a tag so it
 * survives the round trip.
 */
export function toBackendCategory(category: DiscoveryCategory): BackendCategory {
  if (category === "landmark") return "location";
  if (category === "collectible") return "object";
  return category;
}

export function fromBackendCategory(category: string, tags?: readonly string[] | null): DiscoveryCategory {
  if (category === "location" && tags?.includes("landmark")) return "landmark";
  if (category === "object" && tags?.includes("collectible")) return "collectible";
  return (discoveryCategories as readonly string[]).includes(category) ? (category as DiscoveryCategory) : "object";
}

/** Tag that keeps a UI-only category (see toBackendCategory). */
export function categoryTags(category: DiscoveryCategory): string[] {
  return category === "landmark" || category === "collectible" ? [category] : [];
}

const verificationValues: readonly string[] = ["ai_suggested", "awaiting_verification", "verified", "disputed", "rejected"];

/** Discovery status or an already-translated `verification` label -> the UI's verification status. */
export function toVerification(value: string | null | undefined): VerificationStatus {
  if (value === "submitted" || value === "under_review") return "awaiting_verification";
  return verificationValues.includes(value ?? "") ? (value as VerificationStatus) : "awaiting_verification";
}

/** exact -> confirmed; the rest share names. */
export function toPrecision(value: string | null | undefined): LocationPrecision {
  if (value === "exact" || value === "confirmed") return "confirmed";
  if (value === "approximate" || value === "region") return value;
  return "unknown";
}

/** high / medium / low -> high / moderate / low. */
export function toConfidenceLevel(band: string | null | undefined): ConfidenceLevel | undefined {
  if (band === "high" || band === "low") return band;
  if (band === "medium" || band === "moderate") return "moderate";
  return undefined;
}

/*
 * Preset avatars travel in the backend's avatar_url field (it only stores a
 * URL) as <site>/avatar-presets/<id>, recognised by its path on the way back.
 */
const PRESET_PATH = /\/avatar-presets\/([a-z0-9-]+)$/;

export function avatarIdFromUrl(url: string | null | undefined): AvatarPresetId | null {
  const id = url?.match(PRESET_PATH)?.[1];
  return isAvatarPresetId(id) ? id : null;
}

export function avatarUrlFor(id: AvatarPresetId | null, origin: string) {
  return id ? `${origin}/avatar-presets/${id}` : "";
}

/** A photo avatar URL, i.e. avatar_url when it isn't a preset. */
export function photoAvatarUrl(url: string | null | undefined) {
  return url && !avatarIdFromUrl(url) ? url : null;
}

type BackendMember = { username: string; display_name?: string | null; avatar_url?: string | null };

export function toContributor(member: BackendMember | string | null | undefined): Contributor {
  if (!member) return { username: "", displayName: "A contributor (name hidden)" };
  if (typeof member === "string") return { username: member, displayName: member };
  return {
    username: member.username,
    displayName: member.display_name || member.username,
    avatarId: avatarIdFromUrl(member.avatar_url),
  };
}

export function toPage<From, To>(page: ApiPage<From>, map: (item: From) => To): Page<To> {
  return { items: page.results.map(map), total: page.count, page: page.page, pageSize: page.page_size };
}
