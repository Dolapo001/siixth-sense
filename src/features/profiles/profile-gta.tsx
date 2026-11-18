"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { LeonidaMap } from "@/components/maps/leonida-map";
import { categoryConfig } from "@/features/world/categories";
import { useWorldOverview } from "@/features/world/hooks";
import { leonidaPosition } from "@/features/world/leonida-mosaic";
import { discoveryCategories } from "@/features/world/types";
import type { AreaActivity, Profile } from "./types";

/**
 * Where in Leonida a contributor has made discoveries: a pin per area on the
 * GTA VI map (sized by count), placed at the area's centre from the World
 * data, beside the list of areas.
 */
export function TheirLeonida({ areas, displayName }: { areas: AreaActivity[]; displayName: string }) {
  const world = useWorldOverview();
  const regionsByName = new Map((world.data?.regions ?? []).map((region) => [region.name, region]));
  const most = Math.max(1, ...areas.map((area) => area.discoveries));

  return (
    <section aria-labelledby="their-leonida" className="flex flex-col gap-3">
      <h2 id="their-leonida" className="eyebrow">
        Areas explored · {areas.length}
      </h2>
      {areas.length === 0 ? (
        <p className="text-small text-muted">No discoveries placed in Leonida yet.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start">
          <LeonidaMap>
            <ul aria-label={`Areas where ${displayName} made discoveries`} className="absolute inset-0">
              {areas.map((area) => {
                const region = regionsByName.get(area.name);
                if (!region) return null;
                const { left, top } = leonidaPosition(
                  (region.bounds.minX + region.bounds.maxX) / 2,
                  (region.bounds.minY + region.bounds.maxY) / 2,
                );
                const size = 14 + Math.round((area.discoveries / most) * 18);
                return (
                  <li
                    key={area.name}
                    title={`${area.name}: ${area.discoveries}`}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-midnight/85 text-[0.625rem] font-semibold text-fg shadow-lg"
                    style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
                  >
                    <span className="sr-only">{area.name}: </span>
                    {area.discoveries}
                  </li>
                );
              })}
            </ul>
          </LeonidaMap>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {areas.map((area) => (
              <li key={area.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-small font-medium">{area.name}</span>
                {area.verified > 0 && (
                  <span className="inline-flex items-center gap-1 text-meta text-accent">
                    <BadgeCheck aria-hidden className="size-3.5" />
                    {area.verified} verified
                  </span>
                )}
                <span className="meta text-muted">
                  {area.discoveries} {area.discoveries === 1 ? "discovery" : "discoveries"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Their discoveries by GTA category, as bars, with how many the community verified. */
export function CategoryBreakdown({ byCategory, username }: { byCategory: Profile["byCategory"]; username: string }) {
  const rows = discoveryCategories
    .map((category) => ({ category, ...(byCategory[category] ?? { submitted: 0, verified: 0 }) }))
    .filter((row) => row.submitted > 0)
    .sort((a, b) => b.submitted - a.submitted);
  const most = Math.max(1, ...rows.map((row) => row.submitted));

  return (
    <section aria-labelledby="by-category" className="flex flex-col gap-3">
      <h2 id="by-category" className="eyebrow">
        Discoveries by category
      </h2>
      {rows.length === 0 ? (
        <p className="text-small text-muted">No discoveries yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map(({ category, submitted, verified }) => {
            const { plural, icon: Icon } = categoryConfig[category];
            return (
              <li key={category}>
                <Link
                  href={`/discoveries?by=${encodeURIComponent(username)}&category=${category}`}
                  className="group grid grid-cols-[1.25rem_8.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-1 hover:bg-surface-elevated"
                >
                  <Icon aria-hidden className="size-4 text-muted group-hover:text-accent" />
                  <span className="truncate text-small">{plural}</span>
                  <span aria-hidden className="relative h-2 overflow-hidden rounded-full bg-border">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-fg/35"
                      style={{ width: `${(submitted / most) * 100}%` }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-accent"
                      style={{ width: `${(verified / most) * 100}%` }}
                    />
                  </span>
                  <span className="meta text-muted">
                    {submitted}
                    {verified > 0 && <span className="text-accent"> · {verified} verified</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-meta text-muted">Cyan shows the share verified by community reviewers.</p>
    </section>
  );
}
