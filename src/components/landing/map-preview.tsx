"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { buttonStyles } from "@/components/ui/button";
import type { PreviewPlace, PreviewTile } from "@/features/landing/leonida-preview.server";
import { layerConfig, worldLayers, type WorldLayerId } from "@/features/world/layers";
import { cn } from "@/lib/utilities/cn";

type MapPreviewProps = {
  places: PreviewPlace[];
  tiles: PreviewTile[];
  /** Width ÷ height of the mapped area. */
  aspect: number;
};

/**
 * The landing page's look at Leonida: the real GTA VI community map (static
 * tiles, no map engine) with a handful of real landmarks from the data.
 * Selecting one shows what the World Explorer knows about it.
 */
export function MapPreview({ places, tiles, aspect }: MapPreviewProps) {
  const layers = worldLayers.filter((layer) => places.some((place) => place.layer === layer.id));
  const [filter, setFilter] = useState<WorldLayerId | "all">("all");
  const shown = filter === "all" ? places : places.filter((place) => place.layer === filter);
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const selected = shown.find((place) => place.id === selectedId) ?? shown[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-start">
      <div
        className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-xl border border-border bg-[#2f6aa6]"
        style={{ aspectRatio: aspect }}
      >
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element -- plain map tiles; next/image adds nothing here
          <img
            key={tile.src}
            src={tile.src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: `${tile.left}%`, top: `${tile.top}%`, width: `${tile.width}%`, height: `${tile.height}%` }}
          />
        ))}
        {/* Darken slightly so markers and the dark UI read against the bright map art. */}
        <div aria-hidden className="absolute inset-0 bg-midnight/25" />
        <ul aria-label="Featured places" className="absolute inset-0">
          {shown.map((place) => {
            const { icon: Icon } = layerConfig[place.layer];
            const active = place.id === selected?.id;
            return (
              <li key={place.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`${place.title}, ${layerConfig[place.layer].label}`}
                  onClick={() => setSelectedId(place.id)}
                  className={cn(
                    "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-transform before:absolute before:-inset-1.5 before:content-[''] hover:scale-110",
                    active ? "z-10 scale-110 border-accent bg-accent text-midnight" : "border-fg/80 bg-midnight/90 text-fg",
                  )}
                  style={{ left: `${place.left}%`, top: `${place.top}%` }}
                >
                  <Icon aria-hidden className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="meta absolute top-2 right-2 rounded-sm bg-midnight/85 px-1.5 py-0.5 text-[0.6875rem] text-fg/85">
          Community layer ·{" "}
          <a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            gtadb.org
          </a>{" "}
          · CC BY 4.0 · unofficial
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div role="group" aria-label="Show places by layer" className="flex flex-wrap gap-1.5">
          {[{ id: "all" as const, label: "All" }, ...layers].map((layer) => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={filter === layer.id}
              onClick={() => setFilter(layer.id)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-meta font-medium transition-colors pointer-coarse:h-10",
                filter === layer.id ? "border-accent/50 bg-accent/10 text-fg" : "border-border-strong text-muted hover:text-fg",
              )}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {selected && (
          <article aria-live="polite" className="glass-panel flex flex-col gap-3 rounded-xl p-5">
            <p className="eyebrow text-accent">{layerConfig[selected.layer].label}</p>
            <h3 className="text-heading font-semibold">{selected.title}</h3>
            <p className="text-small text-muted">{selected.areas.join(" · ") || "Leonida"}</p>
            {selected.realWorld && (
              <p className="text-small">
                <span className="text-muted">Modelled on </span>
                {selected.realWorld}
              </p>
            )}
            <LocationPrecisionBadge precision="approximate" className="self-start" />
            <Link href={`/world/${selected.id}`} className={buttonStyles({ variant: "secondary", className: "self-start" })}>
              Open in the World Explorer
              <ArrowRight aria-hidden />
            </Link>
          </article>
        )}

        <p className="text-small text-muted">
          {places.length} of thousands of places mapped by the GTA VI community. Names and positions are unofficial
          until they&apos;re checked against the released game.
        </p>
      </div>
    </div>
  );
}
