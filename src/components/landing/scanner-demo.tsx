"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { categoryConfig } from "@/features/world/categories";
import type { DemoDetection, LandingImage } from "@/features/landing/fixtures";
import { easeOutExpo } from "@/lib/motion";
import { cn } from "@/lib/utilities/cn";
import { SceneImage } from "./scene-image";
import { IllustrationTag } from "./section-heading";

type ScannerDemoProps = {
  image: LandingImage;
  detections: DemoDetection[];
  /** "auto" starts after `startDelay`; "in-view" starts when scrolled into view. */
  start?: "auto" | "in-view";
  startDelay?: number;
  /** Compact labels for the small hero preview. */
  compact?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Load the image eagerly (above the fold). */
  eager?: boolean;
  className?: string;
};

/** Viewfinder corner brackets around the demo frame. */
export function ScannerCorners({ className, size = "size-5" }: { className?: string; size?: string }) {
  return (
    <>
      {[
        "top-2 left-2 border-t-2 border-l-2",
        "top-2 right-2 border-t-2 border-r-2",
        "bottom-2 left-2 border-b-2 border-l-2",
        "right-2 bottom-2 border-r-2 border-b-2",
      ].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn("pointer-events-none absolute border-accent/80", size, corner, className)}
        />
      ))}
    </>
  );
}

/**
 * A screenshot being "analysed": scan line, then detection boxes drawing in
 * with labels. Demonstration only; the boxes come from fixture data that
 * matches the artwork, not from a model.
 */
export function ScannerDemo({
  image,
  detections,
  start = "in-view",
  startDelay = 0,
  compact = false,
  selectedId = null,
  onSelect,
  eager = false,
  className,
}: ScannerDemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -120px 0px" });
  const reduce = useReducedMotion();
  const running = start === "auto" || inView;
  const delay = reduce ? 0 : startDelay;
  const sweep = 1.3;
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? selectedId;

  return (
    <div
      ref={ref}
      className={cn("@container relative overflow-hidden rounded-lg border border-white/10 bg-surface", className)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={running ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.8, ease: easeOutExpo, delay }}
        className="relative aspect-[16/10]"
      >
        <SceneImage
          image={image}
          eager={eager}
          className="absolute inset-0 h-full w-full"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-midnight/40 via-transparent to-transparent" />

        {/* One sweep that reveals the detections, then a slow ambient pass. */}
        {!reduce && running && (
          <>
            <motion.div
              aria-hidden
              initial={{ top: "-12%", opacity: 0 }}
              animate={{ top: ["-12%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: sweep, ease: "easeInOut", delay: delay + 0.3 }}
              className="pointer-events-none absolute inset-x-0 h-[12%] bg-linear-to-b from-transparent via-accent/30 to-transparent"
            />
            <motion.div
              aria-hidden
              initial={{ top: "-6%", opacity: 0 }}
              animate={{ top: ["-6%", "100%"], opacity: [0, 0.5, 0.5, 0] }}
              transition={{ duration: 5, ease: "linear", delay: delay + sweep + 2.4, repeat: Infinity, repeatDelay: 6 }}
              className="pointer-events-none absolute inset-x-0 h-px bg-accent/50"
            />
          </>
        )}

        <ScannerCorners />

        <ul aria-label="Example detections" className="absolute inset-0">
          {detections.map((detection, i) => {
            const boxDelay = reduce ? 0 : delay + 0.6 + i * 0.28;
            const isActive = active === detection.id;
            const Icon = categoryConfig[detection.category].icon;
            // Below the box near the top edge, and for subjects low in the frame (keeps labels apart).
            const labelBelow = detection.box.y < 0.12 || detection.box.y > 0.7;
            // Labels for boxes near the right edge hang leftwards so they stay inside the image.
            const labelRight = detection.box.x + detection.box.width > 0.6;
            return (
              <motion.li
                key={detection.id}
                initial={{ opacity: 0, clipPath: "inset(50% 50% 50% 50%)" }}
                // Ends far outside the box so labels hanging off either side are never clipped.
                animate={running ? { opacity: 1, clipPath: "inset(-200px -2000px -200px -2000px)" } : undefined}
                transition={{ duration: 0.45, ease: easeOutExpo, delay: boxDelay }}
                className="absolute"
                style={{
                  left: `${detection.box.x * 100}%`,
                  top: `${detection.box.y * 100}%`,
                  width: `${detection.box.width * 100}%`,
                  height: `${detection.box.height * 100}%`,
                }}
                onPointerEnter={() => setHovered(detection.id)}
                onPointerLeave={() => setHovered(null)}
              >
                <button
                  type="button"
                  onFocus={() => setHovered(detection.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect?.(isActive && selectedId === detection.id ? null : detection.id)}
                  aria-pressed={selectedId === detection.id}
                  aria-label={`${detection.label}: ${detection.detail}, ${Math.round(detection.confidence * 100)}% example confidence`}
                  className={cn(
                    "absolute inset-0 rounded-[3px] border transition-colors duration-200",
                    isActive ? "border-accent bg-accent/10" : "border-accent/70 bg-transparent",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "glass-panel pointer-events-none absolute flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 whitespace-nowrap",
                    labelRight ? "right-0" : "left-0",
                    labelBelow ? "top-full mt-1" : "bottom-full mb-1",
                    compact ? "text-[0.6875rem]" : "text-[0.6875rem] @lg:text-meta",
                  )}
                >
                  <Icon className={cn("shrink-0 text-accent", compact ? "size-3" : "size-3.5")} />
                  {/* Short labels when the scanner is narrow (container query), so labels don't collide. */}
                  <span className={cn("font-mono tracking-wide text-fg uppercase", !compact && "@lg:hidden")}>
                    {detection.category}
                  </span>
                  {!compact && (
                    <span className="hidden font-mono tracking-wide text-fg uppercase @lg:inline">
                      {detection.label}
                    </span>
                  )}
                  <span className="font-mono text-muted">{Math.round(detection.confidence * 100)}%</span>
                </span>
              </motion.li>
            );
          })}
        </ul>

        <IllustrationTag className="absolute right-2 bottom-2" />
      </motion.div>
    </div>
  );
}
