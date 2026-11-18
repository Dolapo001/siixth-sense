"use client";

import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { countByArea, neighbourhoodsOf } from "@/features/world/places";
import type { Region, WorldMarker } from "@/features/world/types";
import { LocationList } from "./location-list";

export type BrowsePath = { area: string | null; neighbourhood: string | null };

type AreaBrowserProps = {
  regions: Region[];
  /** Every place, on every layer: browsing isn't limited by the layer chips. */
  markers: WorldMarker[];
  /** Official destinations, listed first. */
  destinations: ReadonlySet<string>;
  path: BrowsePath;
  onPathChange: (path: BrowsePath) => void;
  /** Frame an area or neighbourhood on the map. */
  onFocus: (markers: WorldMarker[], region?: Region) => void;
  onSelectPlace: (marker: WorldMarker) => void;
};

const rowClass =
  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated focus-visible:bg-surface-elevated";

/**
 * Drill-down through the address hierarchy in the data: area → neighbourhood
 * → places. The keyboard and screen-reader route to everything on the map.
 */
export function AreaBrowser({
  regions,
  markers,
  destinations,
  path,
  onPathChange,
  onFocus,
  onSelectPlace,
}: AreaBrowserProps) {
  if (!path.area) {
    const counts = countByArea(markers);
    const groups = [
      { label: "Destinations", items: regions.filter((r) => destinations.has(r.name)) },
      { label: "All areas", items: regions.filter((r) => !destinations.has(r.name)) },
    ].filter((group) => group.items.length > 0);
    return (
      <div className="flex flex-col gap-5">
        <p className="text-small text-muted">
          Areas as the GTA VI community map names them. Choose one to see its neighbourhoods and places.
        </p>
        {groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-2">
            <h3 className="eyebrow">{group.label}</h3>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {group.items.map((region) => (
                <li key={region.id}>
                  <button
                    type="button"
                    className={rowClass}
                    onClick={() => {
                      onPathChange({ area: region.name, neighbourhood: null });
                      onFocus(
                        markers.filter((m) => m.areas?.at(-1) === region.name),
                        region,
                      );
                    }}
                  >
                    <MapPinned aria-hidden className="size-4 shrink-0 text-muted" />
                    <span className="flex-1 text-small font-medium">{region.name}</span>
                    <span className="meta text-muted">{counts.get(region.name) ?? 0}</span>
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const neighbourhoods = neighbourhoodsOf(markers, path.area);
  const current = path.neighbourhood ? neighbourhoods.find((n) => n.name === path.neighbourhood) : null;

  if (current) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton label={path.area} onClick={() => onPathChange({ area: path.area, neighbourhood: null })} />
        <h3 className="text-body font-semibold">{current.name}</h3>
        <LocationList
          markers={current.markers}
          regions={regions}
          onSelect={onSelectPlace}
          emptyMessage="No places recorded here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton label="All areas" onClick={() => onPathChange({ area: null, neighbourhood: null })} />
      <h3 className="text-body font-semibold">{path.area}</h3>
      {neighbourhoods.length === 0 ? (
        <p className="text-small text-muted">No places recorded in this area yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {neighbourhoods.map((n) => (
            <li key={n.name}>
              <button
                type="button"
                className={rowClass}
                onClick={() => {
                  onPathChange({ area: path.area, neighbourhood: n.name });
                  onFocus(n.markers);
                }}
              >
                <span className="flex-1 text-small font-medium">{n.name}</span>
                <span className="meta text-muted">{n.markers.length}</span>
                <ChevronRight aria-hidden className="size-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 inline-flex min-h-10 items-center gap-1 self-start rounded-md px-1 text-small text-muted hover:text-fg"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {label}
    </button>
  );
}
