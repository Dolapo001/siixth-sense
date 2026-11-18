import type { AvatarPresetId } from "@/components/profiles/avatar-presets";
import type { DiscoveryCategory } from "@/features/world/types";
import type { ConfidenceLevel, LocationPrecision, VerificationStatus } from "@/types/intelligence";

/*
 * Discovery domain types. Frontend shape only until the backend contract
 * exists; an API source will map onto these.
 */

export type Contributor = {
  username: string;
  displayName: string;
  /** Their chosen preset avatar, when the server includes it. */
  avatarId?: AvatarPresetId | null;
};

export type DiscoveryLocation = {
  locationId: string;
  name: string;
  regionId: string | null;
  regionName: string | null;
  precision: LocationPrecision;
};

export type DiscoveryListItem = {
  id: string;
  title: string;
  category: DiscoveryCategory;
  verification: VerificationStatus;
  submittedAt: string;
  contributor: Contributor;
  location: DiscoveryLocation | null;
  screenshot: { url: string; alt: string } | null;
  engagement: { comments: number; confirmations: number };
};

export type VerificationEvent = {
  at: string;
  status: VerificationStatus;
  /** Who caused the change: the analysis service or a community member. */
  actor: { kind: "ai" } | { kind: "member"; username: string };
  note?: string;
};

export type DiscoveryComment = { id: string; author: Contributor; body: string; at: string };

/** Supporting evidence. `author: null` means it came from Sixth Sense's analysis. */
export type EvidenceItem = { id: string; text: string; url?: string; author: Contributor | null; at: string };

/** A community member's alternative identification. */
export type IdentificationSuggestion = {
  id: string;
  author: Contributor;
  label: string;
  category: DiscoveryCategory;
  note?: string;
  at: string;
};

export type Vote = "confirm" | "dispute";

/**
 * What the signed-in viewer may do with this discovery. Decided by the
 * server; the UI never works out eligibility itself. Null when signed out.
 */
export type ViewerPermissions = {
  canComment: boolean;
  canSuggest: boolean;
  canAddEvidence: boolean;
  canReport: boolean;
  vote: { allowed: boolean; reason?: string; current: Vote | null };
  /** Undefined when the backend doesn't support following. */
  followingContributor?: boolean;
};

export type DiscoveryDetail = DiscoveryListItem & {
  description: string;
  detections: {
    id: string;
    label: string;
    category: DiscoveryCategory;
    confidence?: number;
    confidenceLevel?: ConfidenceLevel;
    verification: VerificationStatus;
  }[];
  evidence: EvidenceItem[];
  suggestions: IdentificationSuggestion[];
  verificationHistory: VerificationEvent[];
  comments: DiscoveryComment[];
  related: DiscoveryListItem[];
  /** On-chain record of Sixth Sense's process, if one exists. Not proof the discovery is correct. */
  attestation: { network: string; signature: string; explorerUrl: string; recordedAt: string } | null;
  viewer: ViewerPermissions | null;
};

export const reportReasons = [
  { value: "spam", label: "Spam or advertising" },
  { value: "misleading", label: "Wrong or misleading" },
  { value: "offensive", label: "Offensive or abusive" },
  { value: "copyright", label: "Copyright or ownership issue" },
  { value: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof reportReasons)[number]["value"];
export type ReportTarget = { kind: "discovery" | "comment"; id: string };

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Sharing an analysed screenshot with the community as a new discovery (POST /discoveries). */
export type DiscoverySubmission = {
  /** The analysis job the screenshot went through; the server already has the image. */
  analysisJobId: string;
  title: string;
  category: DiscoveryCategory;
  /** What the contributor thinks it is, or why they're unsure. */
  note?: string;
  /** A candidate place from the analysis, if the contributor picked one. */
  location: { id: string; name: string; areas: string[] } | null;
};
