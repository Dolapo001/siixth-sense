import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { ConfidenceLabel } from "@/components/shared/confidence-label";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { buttonStyles } from "@/components/ui/button";
import { locationHref } from "@/features/world/routing";
import type { LocationMatch } from "@/features/image-analysis/types";

/** Possible locations for the screenshot. Often there are none; say so plainly. */
export function LocationMatches({ matches }: { matches: LocationMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed border-border p-4">
        <MapPinOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-small font-medium">No location match</p>
          <p className="text-small text-muted">There isn&apos;t enough reference data to place this screenshot yet.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => (
        <li key={match.locationId} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body font-semibold">{match.name}</span>
            <LocationPrecisionBadge precision={match.precision} />
          </div>
          <ConfidenceLabel score={match.confidence} />
          <Link
            href={locationHref(match.locationId)}
            className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
          >
            View on map
          </Link>
        </li>
      ))}
    </ul>
  );
}
