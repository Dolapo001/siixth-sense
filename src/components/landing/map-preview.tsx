"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Maximize, Minus, Plus, X } from "lucide-react";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { buttonStyles } from "@/components/ui/button";
import { mapMarkers, regionOnlyExample, type MapMarker } from "@/features/landing/fixtures";
import { categoryConfig } from "@/features/world/categories";
import type { DiscoveryCategory } from "@/features/world/types";
import { easeOutExpo } from "@/lib/motion";
import { cn } from "@/lib/utilities/cn";
import { IllustrationTag } from "./section-heading";

const W = 1000;
const H = 600;
const ZOOMS = [1, 1.35, 1.7];
const categories = [...new Set(mapMarkers.map((m) => m.category))] as DiscoveryCategory[];

/** A fictional coastal region. Not the game map, and labelled as such. */
function IllustrativeMap() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="lp-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f1a28" />
          <stop offset="1" stopColor="#0a1018" />
        </linearGradient>
        <pattern id="lp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#273443" strokeWidth=".6" opacity=".5" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#lp-sea)" />
      <rect width={W} height={H} fill="url(#lp-grid)" />
      <path
        d="M60 0 L1000 0 L1000 110 C940 140 885 165 860 210 C835 255 800 275 790 315 C780 360 755 390 715 410 C675 430 650 470 630 510 C610 550 575 585 540 600 L220 600 C200 560 170 520 150 470 C130 420 90 380 70 320 C50 260 40 200 45 140 C50 90 55 40 60 0 Z"
        fill="#131d29"
        stroke="#2f3f50"
        strokeWidth="1.5"
      />
      {[
        [700, 548, 24, 7],
        [762, 538, 20, 6],
        [812, 516, 18, 6],
        [855, 482, 32, 11],
        [915, 458, 16, 6],
      ].map(([cx, cy, rx, ry]) => (
        <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} fill="#131d29" stroke="#2f3f50" strokeWidth="1.2" />
      ))}
      <ellipse cx="300" cy="478" rx="62" ry="24" fill="#0f1a28" stroke="#2f3f50" />
      {/* Districts */}
      <g fill="none" stroke="#3b4b5d" strokeWidth="1" strokeDasharray="4 6">
        <path d="M380 0 C400 120 360 220 420 300 C470 360 450 460 520 600" />
        <path d="M45 300 C150 290 300 330 420 300" />
        <path d="M420 300 C560 280 680 320 790 315" />
      </g>
      {/* Roads and the causeway to the keys */}
      <g fill="none" stroke="#2c3b4c" strokeLinecap="round">
        <path d="M60 180 C300 205 520 160 830 228" strokeWidth="3" />
        <path d="M470 0 C482 200 520 380 610 515" strokeWidth="3" />
        <path d="M200 600 C240 470 330 380 470 330 C560 300 650 300 760 330" strokeWidth="2" />
        <path d="M610 515 C670 548 760 540 855 482 C880 470 900 462 915 458" strokeWidth="2" strokeDasharray="2 5" />
      </g>
      {/* District names are too small to read on phones, so they show from the sm breakpoint up. */}
      <g className="font-mono max-sm:hidden" fill="#8995a5" fontSize="12" letterSpacing="2.4">
        <text x="150" y="88">
          NORTHERN INLANDS
        </text>
        <text x="520" y="96">
          OLD TOWN
        </text>
        <text x="560" y="275">
          HARBOR DISTRICT
        </text>
        <text x="150" y="405">
          SOUTHERN WETLANDS
        </text>
        <text x="860" y="520">
          KEYS
        </text>
      </g>
    </svg>
  );
}

/** Uncertainty ring for an approximate marker, in the map's own coordinate space. */
function UncertaintyRing({ marker, active }: { marker: MapMarker; active: boolean }) {
  if (marker.precision !== "approximate" || !marker.radius) return null;
  const r = marker.radius;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute rounded-full border border-dashed transition-colors",
        active ? "border-accent/80 bg-accent/5" : "border-muted/50",
      )}
      style={{
        left: `${((marker.x - r) / W) * 100}%`,
        top: `${((marker.y - r) / H) * 100}%`,
        width: `${((2 * r) / W) * 100}%`,
        height: `${((2 * r) / H) * 100}%`,
      }}
    />
  );
}

function MarkerButton({
  marker,
  zoom,
  active,
  onHover,
  onSelect,
}: {
  marker: MapMarker;
  zoom: number;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const { icon: Icon, label } = categoryConfig[marker.category];
  return (
    <div className="absolute" style={{ left: `${(marker.x / W) * 100}%`, top: `${(marker.y / H) * 100}%` }}>
      <button
        type="button"
        onPointerEnter={() => onHover(marker.id)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(marker.id)}
        onBlur={() => onHover(null)}
        onClick={() => onSelect(marker.id)}
        aria-pressed={active}
        aria-label={`${marker.title}, ${label}, ${marker.precision === "approximate" ? "approximate location" : "confirmed location"} (example)`}
        style={{ transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200 sm:size-9",
          marker.precision === "approximate" && "border-dashed",
          active
            ? "border-accent bg-accent text-midnight shadow-[0_0_0_6px_rgb(85_214_208/0.15)]"
            : marker.category === "hidden"
              ? "border-signal/70 bg-surface-elevated text-signal hover:border-signal"
              : "border-white/15 bg-surface-elevated text-fg hover:border-accent",
        )}
      >
        <Icon aria-hidden className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}

export function MapPreview() {
  const [category, setCategory] = useState<DiscoveryCategory | "all">("all");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const zoom = ZOOMS[zoomIndex];
  const visible = mapMarkers.filter((m) => category === "all" || m.category === category);
  const hoveredMarker = mapMarkers.find((m) => m.id === hovered && m.id !== selected);
  const selectedMarker = mapMarkers.find((m) => m.id === selected) ?? null;

  const controlButton =
    "flex size-9 items-center justify-center text-fg/75 transition-colors hover:bg-white/5 hover:text-fg disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Filter example markers"
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setSelected(null);
            }}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-meta transition-colors",
              category === c ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-fg",
            )}
          >
            {c !== "all" &&
              (() => {
                const Icon = categoryConfig[c].icon;
                return <Icon aria-hidden className="size-3.5" />;
              })()}
            {c === "all" ? "All" : categoryConfig[c].plural}
          </button>
        ))}
      </div>

      <div className="relative aspect-[5/3] overflow-hidden rounded-xl border border-white/10 bg-midnight">
        <motion.div
          className="absolute inset-0"
          animate={{ scale: zoom }}
          transition={{ duration: 0.45, ease: easeOutExpo }}
          style={{ transformOrigin: "60% 55%" }}
        >
          <IllustrativeMap />
          {visible.map((marker) => (
            <UncertaintyRing
              key={`ring-${marker.id}`}
              marker={marker}
              active={selected === marker.id || hovered === marker.id}
            />
          ))}
          {visible.map((marker) => (
            <MarkerButton
              key={marker.id}
              marker={marker}
              zoom={zoom}
              active={selected === marker.id || hovered === marker.id}
              onHover={setHovered}
              onSelect={(id) => setSelected(selected === id ? null : id)}
            />
          ))}
        </motion.div>

        <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-2">
          <IllustrationTag className="glass-subtle">Illustrative map · not the game map</IllustrationTag>
        </div>

        <AnimatePresence>
          {hoveredMarker && (
            <motion.div
              key={hoveredMarker.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="glass-panel pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-md px-3 py-2 md:block"
            >
              <p className="text-small font-medium whitespace-nowrap">{hoveredMarker.title}</p>
              <p className="font-mono text-[0.6875rem] text-muted">
                {categoryConfig[hoveredMarker.category].label} · {hoveredMarker.region}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-panel absolute right-3 bottom-3 hidden flex-col overflow-hidden rounded-md sm:flex">
          <button
            type="button"
            aria-label="Zoom in"
            className={controlButton}
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() => setZoomIndex((z) => Math.min(z + 1, ZOOMS.length - 1))}
          >
            <Plus aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className={cn(controlButton, "border-t border-white/10")}
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((z) => Math.max(z - 1, 0))}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Reset view"
            className={cn(controlButton, "border-t border-white/10")}
            onClick={() => setZoomIndex(0)}
          >
            <Maximize aria-hidden className="size-4" />
          </button>
        </div>

        <AnimatePresence>
          {selectedMarker && (
            <motion.aside
              key={selectedMarker.id}
              aria-label={`${selectedMarker.title} (example)`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3, ease: easeOutExpo }}
              className="glass-panel absolute top-3 right-3 hidden w-72 flex-col gap-3 rounded-lg p-4 md:flex"
            >
              <SelectedDetails marker={selectedMarker} onClose={() => setSelected(null)} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* On small screens the details sit below the map, so nothing covers it. */}
      {selectedMarker && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:hidden">
          <SelectedDetails marker={selectedMarker} onClose={() => setSelected(null)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-meta text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-full border border-fg/70" /> Confirmed location
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-full border border-dashed border-fg/70" /> Approximate, with
          uncertainty
        </span>
        <span>
          Region only, listed not pinned: <span className="text-fg/80">{regionOnlyExample.title}</span> ·{" "}
          {regionOnlyExample.region}
        </span>
      </div>
    </div>
  );
}

function SelectedDetails({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  const { icon: Icon, label } = categoryConfig[marker.category];
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-wide text-muted uppercase">
            <Icon aria-hidden className="size-3.5 text-accent" />
            {label}
          </p>
          <p className="text-body font-semibold">{marker.title}</p>
          <p className="text-small text-muted">{marker.region} · example</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="-m-2 flex size-10 items-center justify-center rounded-sm text-muted hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <LocationPrecisionBadge precision={marker.precision} className="self-start" />
      <Link href="/world" className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}>
        Open the World Explorer
        <ArrowRight aria-hidden />
      </Link>
    </>
  );
}
