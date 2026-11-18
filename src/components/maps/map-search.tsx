"use client";

import { useId, useRef, useState } from "react";
import { MapPinned, Search, X } from "lucide-react";
import { categoryConfig } from "@/features/world/categories";
import { searchWorld, type SearchResult } from "@/features/world/markers";
import type { Region, WorldMarker } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

type MapSearchProps = {
  regions: Region[];
  markers: WorldMarker[];
  onSelect: (result: SearchResult) => void;
  className?: string;
};

function resultKey(result: SearchResult) {
  return result.kind === "region" ? `r:${result.region.id}` : `m:${result.marker.id}`;
}

/** Search combobox for regions and locations (WAI-ARIA combobox with listbox popup). */
export function MapSearch({ regions, markers, onSelect, className }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = searchWorld(query, regions, markers);
  const showList = open && query.trim().length > 0;

  const choose = (result: SearchResult) => {
    onSelect(result);
    setQuery(result.kind === "region" ? result.region.name : result.marker.title);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search locations and regions"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        placeholder="Search locations and regions"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && showList && results[active]) {
            event.preventDefault();
            choose(results[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-md border border-border-strong bg-surface/95 pr-9 pl-9 text-small text-fg backdrop-blur placeholder:text-muted hover:border-fg/60 focus-visible:border-accent [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            // The button disappears with the query; keep focus in the search box.
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-0.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
      >
        {results.length === 0 ? (
          <li role="option" aria-selected={false} aria-disabled className="px-3 py-2 text-small text-muted">
            No matches
          </li>
        ) : (
          results.map((result, i) => {
            const Icon = result.kind === "region" ? MapPinned : categoryConfig[result.marker.category].icon;
            return (
              <li
                key={resultKey(result)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // Prevent the input blur from closing the list before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(result)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-small",
                  i === active ? "bg-surface-elevated text-fg" : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{result.kind === "region" ? result.region.name : result.marker.title}</span>
                <span className="meta ml-auto shrink-0 text-muted">
                  {result.kind === "region" ? "Region" : categoryConfig[result.marker.category].label}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
