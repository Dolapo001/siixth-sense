import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { Region } from "@/features/world/types";
import type { DiscoveryQuery } from "../query";
import type {
  DiscoveryComment,
  DiscoveryDetail,
  DiscoveryListItem,
  EvidenceItem,
  IdentificationSuggestion,
  Page,
  ReportReason,
  ReportTarget,
  Vote,
  DiscoverySubmission,
} from "../types";

/**
 * What the discovery feed and detail pages need. Filtering, sorting and
 * paging happen in the source (server-side for the API), never by loading
 * everything into the browser.
 */
export interface DiscoveryDataSource {
  readonly kind: "sample" | "live";
  listDiscoveries(query: DiscoveryQuery, signal?: AbortSignal): Promise<Page<DiscoveryListItem>>;
  getDiscovery(id: string, signal?: AbortSignal): Promise<DiscoveryDetail | null>;
  /** Regions for the region filter. */
  listRegions(): Promise<Region[]>;

  // Community actions. Each requires a signed-in viewer and is checked again by the server.
  addComment(discoveryId: string, body: string): Promise<DiscoveryComment>;
  suggestIdentification(
    discoveryId: string,
    input: Pick<IdentificationSuggestion, "label" | "category" | "note">,
  ): Promise<IdentificationSuggestion>;
  addEvidence(discoveryId: string, input: { text: string; url?: string }): Promise<EvidenceItem>;
  /**
   * Returns the discovery as the server now sees it; status changes are the
   * server's call. Every vote needs a reason, and a vote is final.
   */
  vote(discoveryId: string, vote: Vote, reason: string): Promise<DiscoveryDetail>;
  report(target: ReportTarget, reason: ReportReason, details?: string): Promise<{ reportId: string }>;
  setFollowing(username: string, following: boolean): Promise<{ following: boolean }>;
  /** Shares an analysed screenshot as a new discovery, awaiting community verification. */
  submitDiscovery(input: DiscoverySubmission): Promise<{ id: string }>;
}

/** Thrown when the server refuses an action, with a message safe to show the user. */
export class ActionRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionRefusedError";
  }
}

export async function getDiscoveryDataSource(): Promise<DiscoveryDataSource | null> {
  if (liveApiEnabled()) {
    const { createApiDiscoverySource } = await import("./api-source");
    return createApiDiscoverySource();
  }
  if (devMocksEnabled()) {
    const { createMockDiscoverySource } = await import("./mock-source");
    return createMockDiscoverySource();
  }
  return null;
}
