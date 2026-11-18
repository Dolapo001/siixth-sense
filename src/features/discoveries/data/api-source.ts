/*
 * Discoveries from the Sixth Sense backend. Shapes are documented in the
 * backend's docs/frontend-requirements-response.md (items 9, 14–22).
 */

import { api, ApiError, type ApiPage } from "@/lib/api/client";
import {
  categoryTags,
  fromBackendCategory,
  toBackendCategory,
  toContributor,
  toPage,
  toPrecision,
  toVerification,
} from "@/lib/api/mappers";
import type { Region } from "@/features/world/types";
import { PAGE_SIZE } from "../query";
import type {
  DiscoveryComment,
  DiscoveryDetail,
  DiscoveryListItem,
  DiscoveryLocation,
  EvidenceItem,
  IdentificationSuggestion,
  VerificationEvent,
} from "../types";
import { ActionRefusedError, type DiscoveryDataSource } from "./source";

type Member = { username: string; display_name?: string | null; avatar_url?: string | null };

type BackendDiscovery = {
  public_id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  tags: string[] | null;
  location: {
    public_id: string | null;
    name: string | null;
    region: string | null;
    region_id?: string | null;
    precision: string;
  };
  region: { public_id: string; name: string } | null;
  contributor: string | null;
  engagement: { comments: number; confirmations: number };
  verification: string;
  screenshot: { url: string; alt: string } | null;
  created_at: string;
};

type BackendDetail = BackendDiscovery & {
  contributor_info: Member | null;
  detections: { label: string; category: string; relationship: string; confidence: number | null; entity: string | null }[];
  evidence_items: { id: string; text: string; url: string | null; author: Member | null; at: string }[];
  suggestions: { id: string; author: Member; label: string; category: string; note: string | null; at: string }[];
  verification_history: { at: string; status: string; actor: { kind: "ai" } | { kind: "member"; username: string }; note: string | null }[];
  comments: { id: string; author: Member; body: string; at: string }[];
  related: BackendDiscovery[];
  attestation: { network: string; signature: string; explorer_url: string; recorded_at: string } | null;
  viewer: {
    canComment: boolean;
    canSuggest: boolean;
    canAddEvidence: boolean;
    canReport: boolean;
    vote: { allowed: boolean; reason?: string; current: "confirm" | "dispute" | null };
    followingContributor: boolean | null;
  } | null;
  /** Absent on backends from before weighted votes. */
  verification_progress?: {
    confirm_weight: number;
    dispute_weight: number;
    required: number;
    min_agreement: number;
    trusted_votes: number;
    trusted_required: number;
  } | null;
};

/*
 * Places on the World map come from the gtadb community snapshot, which the
 * backend doesn't hold yet. Until it does, a discovery shared at a map place
 * carries a "place:<gtadb id>" tag, and the place is read back from it.
 */
const PLACE_TAG = "place:";

export const placeTag = (placeId: string) => `${PLACE_TAG}${placeId}`;

export function placeIdFromTags(tags: readonly string[] | null | undefined) {
  return tags?.find((tag) => tag.startsWith(PLACE_TAG))?.slice(PLACE_TAG.length) || null;
}

function toLocation(d: BackendDiscovery): DiscoveryLocation | null {
  const placeId = placeIdFromTags(d.tags);
  const regionId = d.location.region_id ?? d.region?.public_id ?? null;
  const regionName = d.location.region ?? d.region?.name ?? null;
  if (placeId) {
    // Community-mapped positions are approximate until checked against the released game.
    return { locationId: placeId, name: d.location.name ?? "", regionId, regionName, precision: "approximate" };
  }
  if (d.location.public_id) {
    return { locationId: d.location.public_id, name: d.location.name ?? "", regionId, regionName, precision: toPrecision(d.location.precision) };
  }
  if (d.region) {
    return { locationId: "", name: d.region.name, regionId, regionName, precision: "region" };
  }
  return null;
}

function toListItem(d: BackendDiscovery): DiscoveryListItem {
  return {
    id: d.public_id,
    title: d.title,
    category: fromBackendCategory(d.category, d.tags),
    verification: toVerification(d.verification),
    submittedAt: d.created_at,
    contributor: toContributor(d.contributor),
    location: toLocation(d),
    screenshot: d.screenshot,
    engagement: d.engagement,
  };
}

const toComment = (c: BackendDetail["comments"][number]): DiscoveryComment => ({
  id: c.id,
  author: toContributor(c.author),
  body: c.body,
  at: c.at,
});

const toSuggestion = (s: BackendDetail["suggestions"][number]): IdentificationSuggestion => ({
  id: s.id,
  author: toContributor(s.author),
  label: s.label,
  category: fromBackendCategory(s.category),
  note: s.note ?? undefined,
  at: s.at,
});

const toEvidence = (e: BackendDetail["evidence_items"][number]): EvidenceItem => ({
  id: e.id,
  text: e.text,
  url: e.url ?? undefined,
  author: e.author ? toContributor(e.author) : null,
  at: e.at,
});

function toDetail(d: BackendDetail): DiscoveryDetail {
  const named = !!d.contributor_info;
  return {
    ...toListItem(d),
    contributor: toContributor(d.contributor_info),
    description: d.description,
    detections: d.detections.map((det, index) => ({
      id: det.entity ?? `${d.public_id}-${index}`,
      label: det.label,
      category: fromBackendCategory(det.category),
      confidence: det.confidence ?? undefined,
      // Detections linked to a discovery are still the AI's suggestions; only the discovery gets verified.
      verification: "ai_suggested",
    })),
    evidence: d.evidence_items.map(toEvidence),
    suggestions: d.suggestions.map(toSuggestion),
    verificationHistory: d.verification_history.map(
      (event): VerificationEvent => ({
        at: event.at,
        status: toVerification(event.status),
        actor: event.actor,
        note: event.note ?? undefined,
      }),
    ),
    comments: d.comments.map(toComment),
    related: d.related.map(toListItem),
    attestation: d.attestation && {
      network: d.attestation.network,
      signature: d.attestation.signature,
      explorerUrl: d.attestation.explorer_url,
      recordedAt: d.attestation.recorded_at,
    },
    viewer: d.viewer && {
      canComment: d.viewer.canComment,
      canSuggest: d.viewer.canSuggest,
      canAddEvidence: d.viewer.canAddEvidence,
      canReport: d.viewer.canReport,
      vote: d.viewer.vote,
      // null means it's the viewer's own discovery; a hidden contributor can't be followed by name.
      followingContributor: named && d.viewer.followingContributor !== null ? d.viewer.followingContributor : undefined,
    },
    verificationProgress: d.verification_progress
      ? {
          confirmWeight: d.verification_progress.confirm_weight,
          disputeWeight: d.verification_progress.dispute_weight,
          required: d.verification_progress.required,
          minAgreement: d.verification_progress.min_agreement,
          trustedVotes: d.verification_progress.trusted_votes,
          trustedRequired: d.verification_progress.trusted_required,
        }
      : null,
  };
}

/** Server refusals carry a player-safe message; surface it as ActionRefusedError for the UI. */
async function action<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) throw new ActionRefusedError(error.message);
    throw error;
  }
}

export function createApiDiscoverySource(): DiscoveryDataSource {
  return {
    kind: "live",

    async listDiscoveries(query, signal) {
      const page = await api<ApiPage<BackendDiscovery>>("discoveries/", {
        signal,
        query: {
          q: query.q.trim(),
          categories: [...new Set(query.categories.map(toBackendCategory))].join(","),
          region: query.regionId,
          verification: query.verification,
          contributor: query.contributor,
          sort: query.sort,
          page: query.page,
          page_size: PAGE_SIZE,
        },
      });
      return toPage(page, toListItem);
    },

    async getDiscovery(id, signal) {
      try {
        return toDetail(await api<BackendDetail>(`discoveries/${encodeURIComponent(id)}/`, { signal }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    async listRegions(): Promise<Region[]> {
      const regions = await api<{ public_id: string; name: string; bounds: Region["bounds"] | null }[]>("regions/");
      return regions.map((r) => ({ id: r.public_id, name: r.name, bounds: r.bounds ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 } }));
    },

    addComment: (discoveryId, body) =>
      action(async () => {
        const c = await api<{ public_id: string; author: string; body: string; created_at: string }>(
          `discoveries/${encodeURIComponent(discoveryId)}/comments/`,
          { method: "POST", body: { body } },
        );
        return { id: c.public_id, author: toContributor(c.author), body: c.body, at: c.created_at };
      }),

    suggestIdentification: (discoveryId, input) =>
      action(async () =>
        toSuggestion(
          await api(`discoveries/${encodeURIComponent(discoveryId)}/suggestions/`, {
            method: "POST",
            body: { label: input.label, category: toBackendCategory(input.category), note: input.note ?? "" },
          }),
        ),
      ),

    addEvidence: (discoveryId, input) =>
      action(async () =>
        toEvidence(
          await api(`discoveries/${encodeURIComponent(discoveryId)}/evidence/`, {
            method: "POST",
            body: { text: input.text, url: input.url ?? "" },
          }),
        ),
      ),

    vote: (discoveryId, vote, reason) =>
      action(async () =>
        toDetail(
          await api<BackendDetail>(`discoveries/${encodeURIComponent(discoveryId)}/votes/`, {
            method: "POST",
            body: { vote, reason },
          }),
        ),
      ),

    report: (target, reason, details) =>
      action(async () => {
        const { reportId } = await api<{ reportId: string }>("reports/", {
          method: "POST",
          body: { target, reason, details: details ?? "" },
        });
        return { reportId };
      }),

    setFollowing: (username, following) =>
      action(() =>
        api<{ following: boolean }>(`users/${encodeURIComponent(username)}/follow/`, { method: following ? "PUT" : "DELETE" }),
      ),

    submitDiscovery: (input) =>
      action(async () => {
        const where = input.location?.id ?? null;
        const body: Record<string, unknown> = {
          analysis: input.analysisJobId,
          title: input.title,
          category: toBackendCategory(input.category),
          description: input.note ?? "",
          tags: categoryTags(input.category),
          submit: true,
        };
        // Backend places arrive prefixed (see the analysis source); anything else is a World map place.
        if (where?.startsWith("region:")) body.region = where.slice("region:".length);
        else if (where?.startsWith("location:")) body.location = where.slice("location:".length);
        else if (where) body.tags = [...(body.tags as string[]), placeTag(where)];

        try {
          const created = await api<{ public_id: string }>("discoveries/", { method: "POST", body });
          return { id: created.public_id };
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            const duplicates = (error.data as { duplicates?: { title: string }[] } | null)?.duplicates ?? [];
            const titles = duplicates.slice(0, 3).map((d) => `"${d.title}"`).join(", ");
            throw new ActionRefusedError(
              titles ? `This looks like a discovery that's already shared: ${titles}.` : error.message,
            );
          }
          throw error;
        }
      }),
  };
}
