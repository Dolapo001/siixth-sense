import { z } from "zod";
import { discoveryCategories, type DiscoveryCategory } from "@/features/world/types";
import { verificationStatuses, type VerificationStatus } from "@/types/intelligence";

export const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "discussed", label: "Most discussed" },
  { value: "confirmed", label: "Most confirmations" },
] as const;
export type DiscoverySort = (typeof sortOptions)[number]["value"];

export const PAGE_SIZE = 12;

export type DiscoveryQuery = {
  q: string;
  /** Empty means every category. */
  categories: DiscoveryCategory[];
  regionId: string | null;
  verification: VerificationStatus | null;
  /** Username; limits results to one contributor's discoveries. */
  contributor: string | null;
  sort: DiscoverySort;
  page: number;
};

export const defaultQuery: DiscoveryQuery = {
  q: "",
  categories: [],
  regionId: null,
  verification: null,
  contributor: null,
  sort: "newest",
  page: 1,
};

const sortValues = sortOptions.map((o) => o.value) as [DiscoverySort, ...DiscoverySort[]];

/** Lenient parsing: unknown or malformed values fall back to defaults instead of erroring. */
export function parseDiscoveryQuery(params: URLSearchParams): DiscoveryQuery {
  const categories = (params.get("category") ?? "")
    .split(",")
    .filter((c): c is DiscoveryCategory => (discoveryCategories as readonly string[]).includes(c));
  const verification = params.get("status");
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    categories: [...new Set(categories)],
    regionId: params.get("region") || null,
    verification: (verificationStatuses as readonly string[]).includes(verification ?? "")
      ? (verification as VerificationStatus)
      : null,
    contributor: params.get("by") || null,
    sort: z.enum(sortValues).catch("newest").parse(params.get("sort")),
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .catch(1)
      .parse(params.get("page") ?? 1),
  };
}

/** Only non-default values go in the URL, so links stay short. */
export function serializeDiscoveryQuery(query: DiscoveryQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.categories.length > 0 && query.categories.length < discoveryCategories.length) {
    params.set("category", query.categories.join(","));
  }
  if (query.regionId) params.set("region", query.regionId);
  if (query.verification) params.set("status", query.verification);
  if (query.contributor) params.set("by", query.contributor);
  if (query.sort !== defaultQuery.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function isFiltered(query: DiscoveryQuery) {
  return !!(query.q.trim() || query.categories.length || query.regionId || query.verification || query.contributor);
}
