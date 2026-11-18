"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, Car, Eye, Landmark, Package, PawPrint } from "lucide-react";
import { demoDetections, landingImages } from "@/features/landing/fixtures";
import { categoryConfig } from "@/features/world/categories";
import { easeOutExpo } from "@/lib/motion";
import { cn } from "@/lib/utilities/cn";
import { Reveal } from "./reveal";
import { ScannerDemo } from "./scanner-demo";

const recognises = [
  { icon: Car, label: "Vehicles" },
  { icon: Landmark, label: "Landmarks & places" },
  { icon: PawPrint, label: "Wildlife" },
  { icon: Package, label: "Objects & collectibles" },
  { icon: CalendarClock, label: "Events" },
  { icon: Eye, label: "Hidden details" },
];

/** The interactive part of "One screenshot. A world of discoveries." */
export function ScannerShowcase() {
  const [selected, setSelected] = useState<string | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
      <Reveal>
        <ScannerDemo
          image={landingImages.boulevard}
          detections={demoDetections}
          start="in-view"
          selectedId={selected}
          onSelect={setSelected}
          className="shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]"
        />
      </Reveal>

      <div className="flex flex-col gap-8">
        <ol className="flex flex-col gap-3" aria-label="Example analysis">
          {demoDetections.map((detection, i) => {
            const Icon = categoryConfig[detection.category].icon;
            const isSelected = selected === detection.id;
            return (
              <motion.li
                key={detection.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "0px 0px -80px 0px" }}
                transition={{ duration: 0.45, ease: easeOutExpo, delay: reduce ? 0 : 0.9 + i * 0.28 }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(isSelected ? null : detection.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors duration-200",
                    isSelected ? "border-accent/60 bg-accent/5" : "border-border hover:border-muted/60",
                  )}
                >
                  <span className="font-mono text-small text-accent">{detection.index}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2 font-mono text-meta tracking-wide text-muted uppercase">
                      <Icon aria-hidden className="size-3.5" />
                      {categoryConfig[detection.category].label}
                    </span>
                    <span className="text-body font-medium">{detection.detail}</span>
                    <span className="flex items-center gap-2" aria-hidden>
                      <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full bg-accent" style={{ width: `${detection.confidence * 100}%` }} />
                      </span>
                      <span className="font-mono text-meta text-muted">{Math.round(detection.confidence * 100)}%</span>
                    </span>
                  </span>
                  {detection.category === "location" && (
                    <span className="rounded-sm border border-signal/40 px-1.5 py-0.5 font-mono text-meta text-signal uppercase">
                      Unconfirmed
                    </span>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ol>

        <Reveal className="flex flex-col gap-3" delay={0.1}>
          <p className="eyebrow">What Sixth Sense looks for</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {recognises.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-small text-fg/80">
                <Icon aria-hidden className="size-4 text-accent" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-small text-muted">
            Suggestions come with a confidence level and stay unverified until the community checks them.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
