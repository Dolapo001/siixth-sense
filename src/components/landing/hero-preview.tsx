"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, ScanSearch } from "lucide-react";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import type { DemoDetection, LandingImage } from "@/features/landing/fixtures";
import { easeOutExpo } from "@/lib/motion";
import { cn } from "@/lib/utilities/cn";
import { ScannerDemo } from "./scanner-demo";

const START = 1.2;

/** The floating analysis interface on the right of the hero. */
export function HeroPreview({ image, detections }: { image: LandingImage; detections: DemoDetection[] }) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const location = detections.find((d) => d.category === "location");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, ease: easeOutExpo, delay: reduce ? 0 : START }}
      className="relative"
    >
      <div className="glass-panel rounded-xl p-2.5 md:p-3">
        <div className="flex items-center justify-between px-1.5 pb-2.5">
          <p className="flex items-center gap-2 text-meta text-muted">
            <ScanSearch aria-hidden className="size-3.5 text-accent" />
            <span className="font-mono tracking-wide uppercase">Discovery analysis</span>
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-accent">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            {detections.length} entities
          </p>
        </div>
        <ScannerDemo
          image={image}
          detections={detections}
          start="auto"
          startDelay={START + 0.3}
          compact
          selectedId={selected}
          onSelect={setSelected}
        />
        <ul className="mt-2.5 grid grid-cols-3 gap-2">
          {detections.map((detection, i) => (
            <motion.li
              key={detection.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduce ? 0 : START + 1.1 + i * 0.28 }}
            >
              <button
                type="button"
                onClick={() => setSelected(selected === detection.id ? null : detection.id)}
                aria-pressed={selected === detection.id}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
                  selected === detection.id
                    ? "border-accent/60 bg-accent/10"
                    : "border-white/8 bg-midnight/40 hover:border-white/20",
                )}
              >
                <span className="font-mono text-meta tracking-wide text-fg/75 uppercase">
                  {detection.index} · {detection.category}
                </span>
                <span className="truncate text-[0.8125rem] font-medium">{detection.detail}</span>
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${detection.confidence * 100}%` }}
                    />
                  </span>
                  <span className="font-mono text-meta text-fg/75">
                    {Math.round(detection.confidence * 100)}%
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>

      {location && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo, delay: reduce ? 0 : START + 2.0 }}
          className="glass-panel absolute -top-16 right-0 hidden items-center gap-3 rounded-lg px-3 py-2 sm:flex lg:-right-6"
        >
          <MapPin aria-hidden className="size-4 text-signal" />
          <div className="flex flex-col">
            <span className="font-mono text-meta tracking-wide text-fg/75 uppercase">
              Possible location match
            </span>
            <span className="text-small font-medium">Bayfront (example)</span>
          </div>
          <LocationPrecisionBadge precision="approximate" />
        </motion.div>
      )}
    </motion.div>
  );
}
