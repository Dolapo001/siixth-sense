import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { markerKind } from "@/features/world/markers";
import type { Region, WorldMarker } from "@/features/world/types";

type LocationListProps = {
  markers: WorldMarker[];
  regions: Region[];
  onSelect: (marker: WorldMarker) => void;
  /** Shown when the list is empty. */
  emptyMessage: string;
  intro?: string;
};

/**
 * Locations as a list. Used for items without a coordinate (region-only or
 * unknown), which are never pinned so we don't imply a position, and as the
 * whole explorer when the map can't start.
 */
export function LocationList({ markers, regions, onSelect, emptyMessage, intro }: LocationListProps) {
  if (markers.length === 0) {
    return <p className="text-small text-muted">{emptyMessage}</p>;
  }
  const regionName = (id: string | null) => regions.find((r) => r.id === id)?.name ?? "Area unknown";

  return (
    <div className="flex flex-col gap-3">
      {intro && <p className="text-small text-muted">{intro}</p>}
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {markers.map((marker) => {
          const Icon = markerKind(marker).icon;
          return (
            <li key={marker.id}>
              <button
                type="button"
                onClick={() => onSelect(marker)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated"
              >
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-small">{marker.title}</span>
                  <span className="text-meta text-muted">
                    {marker.areas?.length ? marker.areas.join(" · ") : regionName(marker.regionId)}
                  </span>
                </span>
                <LocationPrecisionBadge precision={marker.precision} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
