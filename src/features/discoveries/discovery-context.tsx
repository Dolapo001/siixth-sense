"use client";

import Link from "next/link";
import { ArrowRight, BookCheck, Bot, Camera, MapPin, Users } from "lucide-react";
import { StaticMap } from "@/components/maps/static-map";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "@/features/world/hooks";
import { locationHref } from "@/features/world/routing";
import type { DiscoveryDetail } from "./types";

/**
 * Where the discovery is: the GTA VI map around it when the World data knows
 * the place, its area chain, precision, and a way into the World Explorer.
 */
export function DiscoveryLocationCard({ discovery }: { discovery: DiscoveryDetail }) {
  const location = useLocation(discovery.location?.locationId ?? null);
  if (!discovery.location) {
    return (
      <p className="text-small text-muted">
        No location yet. If you know where this is, say so in the discussion or add evidence.
      </p>
    );
  }
  const place = location.data;
  return (
    <div className="flex flex-col gap-3">
      {location.isPending ? (
        <Skeleton className="aspect-video w-full" />
      ) : place?.coordinate ? (
        <StaticMap center={place.coordinate} label={`Map around ${place.name}`} />
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold">{place?.name ?? discovery.location.name}</p>
        <p className="flex items-center gap-1 text-small text-muted">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          {place?.areas?.length ? place.areas.join(" · ") : (discovery.location.regionName ?? "Area unknown")}
        </p>
      </div>
      <LocationPrecisionBadge precision={discovery.location.precision} className="self-start" />
      <Link
        href={locationHref(discovery.location.locationId)}
        className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
      >
        Open in the World Explorer
        <ArrowRight aria-hidden />
      </Link>
    </div>
  );
}

/** Where each part of the page comes from, so readers can judge how much to trust it. */
export function DiscoverySources({ discovery }: { discovery: DiscoveryDetail }) {
  const location = useLocation(discovery.location?.locationId ?? null);
  const verified = discovery.verification === "verified";
  const locationSource = location.data?.source;

  const rows = [
    {
      icon: Camera,
      title: "Screenshot and report",
      body: (
        <>
          Shared by <span className="text-fg">{discovery.contributor.displayName}</span>.
        </>
      ),
    },
    {
      icon: verified ? Users : Bot,
      title: "Identification",
      body: verified
        ? "Confirmed by community reviewers."
        : "Sixth Sense's AI suggestions and players' proposals. Not confirmed by reviewers yet.",
    },
    ...(locationSource
      ? [
          {
            icon: MapPin,
            title: "Location data",
            body: (
              <>
                <a
                  href={locationSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg underline decoration-fg/40 underline-offset-2 hover:text-accent"
                >
                  {locationSource.name}
                </a>
                ,{" "}
                <a
                  href={locationSource.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-fg"
                >
                  {locationSource.license}
                </a>
                . {locationSource.note}
              </>
            ),
          },
        ]
      : []),
    {
      icon: BookCheck,
      title: "Official source",
      body: "None linked. Nothing here comes from Rockstar Games.",
    },
  ];

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex gap-3">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="flex flex-col gap-0.5">
            <p className="text-small font-medium">{title}</p>
            <p className="text-small text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
