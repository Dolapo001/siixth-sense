"use client";

import Link from "next/link";
import { MapPin, MapPinOff } from "lucide-react";
import { StaticMap } from "@/components/maps/static-map";
import { ConfidenceLabel } from "@/components/shared/confidence-label";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonStyles } from "@/components/ui/button";
import { useLocation } from "@/features/world/hooks";
import { locationHref } from "@/features/world/routing";
import type { LocationMatch } from "@/features/image-analysis/types";

/**
 * Possible locations for the screenshot, each shown on the GTA VI map when the
 * World data knows the place. Often there are none; say so plainly.
 */
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
    <ol className="flex flex-col gap-3">
      {matches.map((match, index) => (
        <MatchCard key={match.locationId} match={match} rank={matches.length > 1 ? index + 1 : null} />
      ))}
    </ol>
  );
}

function MatchCard({ match, rank }: { match: LocationMatch; rank: number | null }) {
  const location = useLocation(match.locationId);
  const place = location.data;

  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
      {location.isPending ? (
        <Skeleton className="aspect-video w-full rounded-none" />
      ) : place?.coordinate ? (
        <StaticMap
          center={place.coordinate}
          label={`Map around ${place.name}`}
          className="rounded-none border-0 border-b border-border"
        />
      ) : null}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            {rank && <span className="meta text-muted">Candidate {rank}</span>}
            <span className="text-body font-semibold">{place?.name ?? match.name}</span>
            {place?.areas?.length ? (
              <span className="flex items-center gap-1 text-small text-muted">
                <MapPin aria-hidden className="size-3.5" />
                {place.areas.join(" · ")}
              </span>
            ) : null}
          </div>
          <LocationPrecisionBadge precision={match.precision} />
        </div>
        {match.basis && <p className="text-small text-muted">{match.basis}</p>}
        <ConfidenceLabel score={match.confidence} />
        {location.isSuccess && !place && (
          <p className="text-meta text-muted">This place isn&apos;t on the World map yet.</p>
        )}
        <Link
          href={locationHref(match.locationId)}
          className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          View on map
        </Link>
      </div>
    </li>
  );
}
