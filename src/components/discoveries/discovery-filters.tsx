"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Search, X } from "lucide-react";
import { CategoryFilter } from "@/components/maps/category-filter";
import { verificationLabel } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import {
  defaultQuery,
  isFiltered,
  sortOptions,
  type DiscoveryQuery,
  type DiscoverySort,
} from "@/features/discoveries/query";
import { discoveryCategories, type Region } from "@/features/world/types";
import { verificationStatuses, type VerificationStatus } from "@/types/intelligence";

type DiscoveryFiltersProps = {
  query: DiscoveryQuery;
  regions: Region[];
  /** Apply a change. Filters reset to page 1. */
  onChange: (next: DiscoveryQuery) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function DiscoveryFilters({ query, regions, onChange }: DiscoveryFiltersProps) {
  const [search, setSearch] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  const update = (patch: Partial<DiscoveryQuery>) => onChange({ ...query, ...patch, page: 1 });
  const applySearch = useEffectEvent((q: string) => {
    if (q === query.q) return;
    // Our own update: mark it synced so the URL change doesn't overwrite newer keystrokes.
    setSyncedQ(q);
    update({ q });
  });

  // Keep the box in sync when the URL changes from elsewhere (back button, clear filters).
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    setSearch(query.q);
  }

  useEffect(() => {
    const timer = setTimeout(() => applySearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedCategories = new Set(query.categories.length ? query.categories : discoveryCategories);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Search discoveries"
            placeholder="Search by title, location or contributor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-small text-fg placeholder:text-muted hover:border-fg/60 focus-visible:border-accent"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <label className="sr-only" htmlFor="discovery-region">
            Region
          </label>
          <div className="md:w-48">
            <Select
              id="discovery-region"
              value={query.regionId ?? ""}
              onChange={(event) => update({ regionId: event.target.value || null })}
            >
              <option value="">All regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="sr-only" htmlFor="discovery-status">
            Verification status
          </label>
          <div className="md:w-48">
            <Select
              id="discovery-status"
              value={query.verification ?? ""}
              onChange={(event) => update({ verification: (event.target.value || null) as VerificationStatus | null })}
            >
              <option value="">Any status</option>
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {verificationLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <label className="sr-only" htmlFor="discovery-sort">
            Sort
          </label>
          <div className="md:w-44">
            <Select
              id="discovery-sort"
              value={query.sort}
              onChange={(event) => update({ sort: event.target.value as DiscoverySort })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <CategoryFilter
            selected={selectedCategories}
            onChange={(next) => update({ categories: next.size === discoveryCategories.length ? [] : [...next] })}
          />
        </div>
        {query.contributor && (
          <Button variant="secondary" size="sm" onClick={() => update({ contributor: null })}>
            By @{query.contributor}
            <X aria-hidden />
            <span className="sr-only">, remove contributor filter</span>
          </Button>
        )}
        {isFiltered(query) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              onChange({ ...defaultQuery, sort: query.sort });
            }}
          >
            <X aria-hidden />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
