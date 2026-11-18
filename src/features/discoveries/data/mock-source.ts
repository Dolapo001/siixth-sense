/*
 * ⚠ DEVELOPMENT SAMPLE DATA — NOT REAL DISCOVERIES.
 *
 * Built from the World Explorer sample data so links between the map,
 * analysis and discoveries resolve in development. Generic names only;
 * always labelled "Sample data" in the UI.
 */

import { getSession, SAMPLE_VIEWER } from "@/features/authentication/session";
import { getSampleWorld } from "@/features/world/data/mock-source";
import type { Region } from "@/features/world/types";
import { accountFor, presentContributor } from "@/features/profiles/data/sample-identity";
import type { VerificationStatus } from "@/types/intelligence";
import { PAGE_SIZE, type DiscoveryQuery } from "../query";
import type {
  Contributor,
  DiscoveryComment,
  DiscoveryDetail,
  DiscoveryListItem,
  EvidenceItem,
  IdentificationSuggestion,
  ReportReason,
  ReportTarget,
  VerificationEvent,
  ViewerPermissions,
  Vote,
} from "../types";
import { ActionRefusedError, type DiscoveryDataSource } from "./source";

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const contributors: Contributor[] = Array.from({ length: 8 }, (_, i) => ({
  username: `sample_user_${i + 1}`,
  displayName: `Sample User ${i + 1}`,
}));

/**
 * Real named places from the GTA VI community map (gtadb ids), so sample
 * discoveries sit somewhere real and their maps and "Open in the World
 * Explorer" links work. Which place a sample discovery is at is arbitrary.
 */
const samplePlaces = [
  { id: "L130", name: "Pegassi Residences South Tower", areas: ["Tequesta Retreat", "Vice City"] },
  { id: "L1", name: "Vice Regal", areas: ["Washington Beach", "Vice Beach"] },
  { id: "L13", name: "Albany Hotel", areas: ["Washington Beach", "Vice Beach"] },
  { id: "L281", name: "Gellhorn International Raceway", areas: ["Port Gellhorn"] },
  { id: "L283", name: "Gas Stop", areas: ["Port Gellhorn"] },
  { id: "L399", name: "Sugar Mill", areas: ["Allied Crystal", "Ambrosia"] },
  { id: "L266", name: "Jason's House", areas: ["Key Lento"] },
  { id: "L257", name: "Beacon", areas: ["Hamlet"] },
  { id: "L258", name: "Rattlers", areas: ["Hamlet"] },
  { id: "L265", name: "Sunrise RV Park", areas: ["Mariana County"] },
  { id: "L278", name: "Warehouse", areas: ["Kelly County"] },
  { id: "L151", name: "Redwood Suites", areas: ["Rialto Islands"] },
  { id: "L422", name: "Rivo Bridge", areas: ["Rialto Islands"] },
  { id: "L161", name: "Arrow Gas Station", areas: ["Waning Sands"] },
  { id: "L393", name: "Bite House", areas: ["Watson Bay"] },
  { id: "L544", name: "Watson Bay Water Tower", areas: ["Watson Bay"] },
  { id: "L530", name: "Mount Kalaga", areas: ["Lummox County"] },
  { id: "L533", name: "Leaf Links Golf Club", areas: ["Vice-Dale County"] },
  { id: "L1064", name: "Capri City Jackals Stadium", areas: ["Capri"] },
  { id: "L445", name: "Presidential Bunker", areas: ["Leonard County"] },
];

const areaId = (area: string) => area.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** The areas sample discoveries sit in, for the feed's area filter. (The filter doesn't use bounds.) */
const sampleAreas: Region[] = [...new Set(samplePlaces.map((place) => place.areas.at(-1)!))]
  .sort()
  .map((name) => ({ id: areaId(name), name, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } }));

function buildSampleDiscoveries() {
  const { locations } = getSampleWorld();
  const items: DiscoveryListItem[] = [];

  for (const location of locations.values()) {
    for (const discovery of location.discoveries) {
      const h = hash(discovery.id);
      items.push({
        id: discovery.id,
        title: discovery.title,
        category: discovery.category,
        verification: discovery.verification,
        submittedAt: discovery.submittedAt,
        // A few belong to the sample viewer, so "your own discovery" and rewards have something to show.
        contributor: items.length % 17 === 5 ? SAMPLE_VIEWER : contributors[h % contributors.length],
        location:
          location.precision === "unknown"
            ? null
            : (() => {
                const place = samplePlaces[h % samplePlaces.length];
                return {
                  locationId: place.id,
                  name: place.name,
                  regionId: areaId(place.areas.at(-1)!),
                  regionName: place.areas.at(-1)!,
                  precision: "approximate" as const,
                };
              })(),
        screenshot: null,
        engagement: { comments: h % 9, confirmations: (h >>> 4) % 14 },
      });
    }
  }
  return items;
}

const sampleItems = buildSampleDiscoveries();

/** History that ends in the discovery's current status. Always starts as an AI suggestion. */
function historyFor(item: DiscoveryListItem): VerificationEvent[] {
  const start = new Date(item.submittedAt).getTime();
  const at = (hours: number) => new Date(start + hours * 3_600_000).toISOString();
  const member = (n: number) => ({ kind: "member" as const, username: contributors[(hash(item.id) + n) % 8].username });
  const events: VerificationEvent[] = [
    { at: at(0), status: "ai_suggested", actor: { kind: "ai" }, note: "Submitted and analysed." },
  ];
  if (item.verification === "ai_suggested") return events;
  events.push({ at: at(2), status: "awaiting_verification", actor: member(0), note: "Requested community review." });
  if (item.verification === "awaiting_verification") return events;
  const finalNote: Record<Exclude<VerificationStatus, "ai_suggested" | "awaiting_verification">, string> = {
    verified: "Confirmed by community reviewers.",
    disputed: "Reviewers disagree with the identification.",
    rejected: "Reviewers found the identification incorrect.",
  };
  events.push({ at: at(26), status: item.verification, actor: member(1), note: finalNote[item.verification] });
  return events;
}

/*
 * In-memory community state, seeded deterministically and changed by the
 * community actions below. Lives for the browser session only.
 */
type CommunityState = {
  comments: DiscoveryComment[];
  evidence: EvidenceItem[];
  suggestions: IdentificationSuggestion[];
  history: VerificationEvent[];
  votes: Map<string, { vote: Vote; reason?: string }>;
};

const community = new Map<string, CommunityState>();
/** Descriptions of discoveries shared from Analyze during this session. */
const submittedNotes = new Map<string, string>();
const following = new Set<string>();
const reports: { id: string; target: ReportTarget; reason: ReportReason; details?: string }[] = [];
let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;

function stateFor(item: DiscoveryListItem): CommunityState {
  let state = community.get(item.id);
  if (!state) {
    const start = new Date(item.submittedAt).getTime();
    const h = hash(item.id);
    state = {
      comments: Array.from({ length: item.engagement.comments }, (_, i) => ({
        id: `${item.id}-c${i + 1}`,
        author: contributors[(h + i + 2) % 8],
        body: `Sample comment ${i + 1}. Placeholder discussion for development.`,
        at: new Date(start + (i + 1) * 5_400_000).toISOString(),
      })),
      evidence:
        item.verification === "ai_suggested"
          ? []
          : [
              {
                id: `${item.id}-e1`,
                text: "Sample evidence: matched against a reference screenshot.",
                author: null,
                at: item.submittedAt,
              },
            ],
      suggestions:
        item.verification === "disputed"
          ? [
              {
                id: `${item.id}-s1`,
                author: contributors[(h + 5) % 8],
                label: `Sample alternative ${item.category}`,
                category: item.category,
                note: "Sample suggestion: the shape doesn't match the reference.",
                at: new Date(start + 30 * 3_600_000).toISOString(),
              },
            ]
          : [],
      history: historyFor(item),
      votes: new Map(),
    };
    community.set(item.id, state);
  }
  return state;
}

/**
 * SAMPLE RULE, for development only. The real backend decides how votes
 * change status; the UI just shows what it returns.
 * A dispute marks the discovery disputed. 10+ confirmations with no open
 * disputes marks it verified. Anything else moves an AI suggestion to review.
 */
function applySampleVoteRule(item: DiscoveryListItem, state: CommunityState, actor: Contributor) {
  const disputes = [...state.votes.values()].filter((v) => v.vote === "dispute");
  const event = (status: VerificationStatus, note: string) =>
    state.history.push({ at: new Date().toISOString(), status, actor: { kind: "member", username: actor.username }, note });

  if (disputes.length > 0 && item.verification !== "disputed") {
    item.verification = "disputed";
    event("disputed", disputes.at(-1)!.reason ?? "Disputed by a reviewer.");
  } else if (disputes.length === 0 && item.engagement.confirmations >= 10 && item.verification !== "verified") {
    item.verification = "verified";
    event("verified", "Confirmed by community reviewers.");
  } else if (item.verification === "ai_suggested") {
    item.verification = "awaiting_verification";
    event("awaiting_verification", "Community review started.");
  }
}

function permissionsFor(item: DiscoveryListItem, state: CommunityState, viewer: Contributor | null): ViewerPermissions | null {
  if (!viewer) return null;
  const own = item.contributor.username === viewer.username;
  const closed = item.verification === "rejected";
  return {
    canComment: true,
    canSuggest: !closed,
    canAddEvidence: !closed,
    canReport: !own,
    vote: {
      allowed: !own && !closed,
      reason: own
        ? "You can't verify your own discovery."
        : closed
          ? "Rejected discoveries are closed to new votes."
          : undefined,
      current: state.votes.get(viewer.username)?.vote ?? null,
    },
    followingContributor: own ? undefined : following.has(item.contributor.username),
  };
}

/** Only some verified sample discoveries carry a sample attestation, to show both states. */
export function sampleAttestationFor(item: DiscoveryListItem, history: VerificationEvent[]) {
  const h = hash(item.id);
  if (item.verification !== "verified" || h % 2 !== 0) return null;
  return {
    network: "Solana devnet (sample)",
    signature: `SAMPLE${h.toString(36).toUpperCase()}SIGNATURE`,
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    recordedAt: history.at(-1)!.at,
  };
}

/** Contributors as they currently present themselves (profile edits, avatars). */
function presentItem(item: DiscoveryListItem): DiscoveryListItem {
  return { ...item, contributor: presentContributor(item.contributor) };
}

function presentDetail(detail: DiscoveryDetail): DiscoveryDetail {
  return {
    ...detail,
    contributor: presentContributor(detail.contributor),
    comments: detail.comments.map((c) => ({ ...c, author: presentContributor(c.author) })),
    evidence: detail.evidence.map((e) => ({ ...e, author: e.author && presentContributor(e.author) })),
    suggestions: detail.suggestions.map((s) => ({ ...s, author: presentContributor(s.author) })),
    related: detail.related.map(presentItem),
  };
}

function detailFor(item: DiscoveryListItem, viewer: Contributor | null): DiscoveryDetail {
  const h = hash(item.id);
  const state = stateFor(item);
  return {
    ...item,
    engagement: { ...item.engagement },
    description:
      submittedNotes.get(item.id) ??
      "Placeholder description for development. This is sample data, not a real discovery.",
    detections: Array.from({ length: 1 + (h % 3) }, (_, i) => ({
      id: `${item.id}-det${i + 1}`,
      label: `Sample ${i === 0 ? item.category : "entity"} ${i + 1}`,
      category: i === 0 ? item.category : "object",
      confidence: Math.round((0.35 + ((h >>> (i * 3)) % 60) / 100) * 100) / 100,
      verification: i === 0 ? item.verification : "ai_suggested",
    })),
    evidence: [...state.evidence],
    suggestions: [...state.suggestions],
    verificationHistory: [...state.history],
    comments: [...state.comments],
    related: sampleItems
      .filter((other) => other.id !== item.id && other.location?.regionId === item.location?.regionId)
      .slice(h % 10, (h % 10) + 3),
    attestation: sampleAttestationFor(item, state.history),
    viewer: permissionsFor(item, state, viewer),
  };
}

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Applies the query the way a server would: filter, sort, then page. */
export function queryDiscoveries(items: DiscoveryListItem[], query: DiscoveryQuery) {
  const q = query.q.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      (!q ||
        item.title.toLowerCase().includes(q) ||
        item.location?.name.toLowerCase().includes(q) ||
        item.contributor.displayName.toLowerCase().includes(q)) &&
      (query.categories.length === 0 || query.categories.includes(item.category)) &&
      (!query.regionId || item.location?.regionId === query.regionId) &&
      (!query.verification || item.verification === query.verification) &&
      (!query.contributor || item.contributor.username === query.contributor),
  );
  const time = (item: DiscoveryListItem) => new Date(item.submittedAt).getTime();
  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "oldest":
        return time(a) - time(b) || a.id.localeCompare(b.id);
      case "discussed":
        return b.engagement.comments - a.engagement.comments || time(b) - time(a);
      case "confirmed":
        return b.engagement.confirmations - a.engagement.confirmations || time(b) - time(a);
      default:
        return time(b) - time(a) || a.id.localeCompare(b.id);
    }
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  return {
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    page,
    pageSize: PAGE_SIZE,
  };
}

async function requireViewer() {
  const session = await getSession();
  if (!session) throw new ActionRefusedError("Sign in to do that.");
  return session.user;
}

function requireItem(id: string) {
  const item = sampleItems.find((candidate) => candidate.id === id);
  if (!item) throw new ActionRefusedError("This discovery no longer exists.");
  return item;
}

export function createMockDiscoverySource(): DiscoveryDataSource {
  return {
    kind: "sample",
    async listDiscoveries(query) {
      await delay();
      // A renamed contributor's new name still finds their discoveries.
      const page = queryDiscoveries(sampleItems, {
        ...query,
        contributor: query.contributor ? accountFor(query.contributor) : null,
      });
      return { ...page, items: page.items.map(presentItem) };
    },
    async getDiscovery(id) {
      await delay();
      const item = sampleItems.find((candidate) => candidate.id === id);
      const session = await getSession();
      return item ? presentDetail(detailFor(item, session?.user ?? null)) : null;
    },
    async listRegions() {
      return sampleAreas;
    },

    async addComment(discoveryId, body) {
      const viewer = await requireViewer();
      const item = requireItem(discoveryId);
      await delay();
      const comment = { id: nextId(`${discoveryId}-c`), author: viewer, body, at: new Date().toISOString() };
      stateFor(item).comments.push(comment);
      item.engagement.comments += 1;
      return comment;
    },

    async suggestIdentification(discoveryId, input) {
      const viewer = await requireViewer();
      const item = requireItem(discoveryId);
      if (item.verification === "rejected") throw new ActionRefusedError("This discovery is closed.");
      await delay();
      const suggestion = { id: nextId(`${discoveryId}-s`), author: viewer, at: new Date().toISOString(), ...input };
      stateFor(item).suggestions.push(suggestion);
      return suggestion;
    },

    async addEvidence(discoveryId, input) {
      const viewer = await requireViewer();
      const item = requireItem(discoveryId);
      if (item.verification === "rejected") throw new ActionRefusedError("This discovery is closed.");
      await delay();
      const evidence = { id: nextId(`${discoveryId}-e`), author: viewer, at: new Date().toISOString(), ...input };
      stateFor(item).evidence.push(evidence);
      return evidence;
    },

    async vote(discoveryId, vote, reason) {
      const viewer = await requireViewer();
      const item = requireItem(discoveryId);
      const state = stateFor(item);
      const permissions = permissionsFor(item, state, viewer)!;
      if (!permissions.vote.allowed) throw new ActionRefusedError(permissions.vote.reason ?? "You can't vote on this.");
      if (vote === "dispute" && !reason?.trim()) throw new ActionRefusedError("Say why you're disputing it.");
      await delay();
      const previous = state.votes.get(viewer.username)?.vote;
      if (previous === "confirm") item.engagement.confirmations -= 1;
      if (vote === "confirm") item.engagement.confirmations += 1;
      state.votes.set(viewer.username, { vote, reason });
      applySampleVoteRule(item, state, viewer);
      return presentDetail(detailFor(item, viewer));
    },

    async report(target, reason, details) {
      await requireViewer();
      await delay();
      const report = { id: nextId("report"), target, reason, details };
      reports.push(report);
      return { reportId: report.id };
    },

    async setFollowing(username, follow) {
      await requireViewer();
      await delay();
      if (follow) following.add(username);
      else following.delete(username);
      return { following: follow };
    },

    async submitDiscovery(input) {
      const viewer = await requireViewer();
      await delay();
      const id = nextId("shared");
      const item: DiscoveryListItem = {
        id,
        title: input.title,
        category: input.category,
        // A new discovery always starts unverified; only reviewers can change that.
        verification: "awaiting_verification",
        submittedAt: new Date().toISOString(),
        contributor: viewer,
        location: input.location
          ? {
              locationId: input.location.id,
              name: input.location.name,
              regionId: null,
              regionName: input.location.areas.at(-1) ?? null,
              precision: "approximate",
            }
          : null,
        screenshot: null,
        engagement: { comments: 0, confirmations: 0 },
      };
      sampleItems.unshift(item);
      submittedNotes.set(id, input.note || "Shared from Analyze for the community to identify.");
      return { id };
    },
  };
}

/** Every sample discovery with its current community state, for the profiles mock. */
export function getSampleCommunitySnapshot() {
  return {
    contributors,
    items: sampleItems.map((item) => ({ item, history: stateFor(item).history, comments: stateFor(item).comments })),
    following,
  };
}

/** Exposed for tests. */
export const __sample = { items: sampleItems, reports };
