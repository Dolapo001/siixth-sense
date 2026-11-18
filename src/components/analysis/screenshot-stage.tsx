"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { getConfidenceLevel } from "@/components/shared/confidence-label";
import { fadeIn, stagger } from "@/lib/motion";
import type { Detection } from "@/features/image-analysis/types";
import { cn } from "@/lib/utilities/cn";

const levelText = { high: "high confidence", moderate: "moderate confidence", low: "low confidence" } as const;

function confidenceText(detection: Detection) {
  const level =
    detection.confidenceLevel ?? (detection.confidence !== undefined ? getConfidenceLevel(detection.confidence) : null);
  if (!level) return null;
  return detection.confidence !== undefined
    ? `${levelText[level]}, ${Math.round(detection.confidence * 100)}%`
    : levelText[level];
}

type ScreenshotStageProps = {
  src: string;
  alt: string;
  /** True only while the analysis service reports queued/processing. */
  scanning: boolean;
  detections: Detection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * The screenshot with detection boxes on top. The wrapper shrink-wraps the
 * image, and boxes are positioned in percentages of it, so they stay aligned
 * at every size. Detections without a box aren't drawn.
 *
 * Kept quiet on purpose: each box shows only its number (matching the list),
 * and its name appears on hover, keyboard focus or selection. Selecting one
 * dims the rest. A toggle hides every box to see the screenshot clean.
 */
export function ScreenshotStage({ src, alt, scanning, detections, selectedId, onSelect }: ScreenshotStageProps) {
  const [showBoxes, setShowBoxes] = useState(true);
  // Numbers follow the list order so a box and its card share one; the biggest boxes
  // are drawn first, so smaller ones sit on top and stay clickable.
  const boxed = detections
    .map((detection, index) => ({ detection, number: index + 1 }))
    .filter(({ detection }) => detection.box)
    .sort((a, b) => area(b.detection) - area(a.detection));
  const anySelected = boxed.some(({ detection }) => detection.id === selectedId);

  return (
    <div className="flex flex-col gap-2 self-start rounded-lg border border-border bg-surface p-2">
      {boxed.length > 0 && !scanning && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-meta text-muted">
            {boxed.length} marked · hover or select one to see what it is
          </p>
          <button
            type="button"
            onClick={() => setShowBoxes((shown) => !shown)}
            aria-pressed={!showBoxes}
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-meta text-muted hover:text-fg"
          >
            {showBoxes ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
            {showBoxes ? "Hide boxes" : "Show boxes"}
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={src} alt={alt} className="block h-auto max-h-[70vh] w-auto max-w-full rounded-md" />

          {scanning && (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
              <div className="absolute inset-0 bg-midnight/30" />
              <div className="sid-scanline absolute inset-x-0 h-16 bg-linear-to-b from-transparent via-accent/25 to-transparent" />
              {[
                "top-2 left-2 border-t-2 border-l-2",
                "top-2 right-2 border-t-2 border-r-2",
                "bottom-2 left-2 border-b-2 border-l-2",
                "right-2 bottom-2 border-r-2 border-b-2",
              ].map((corner) => (
                <span key={corner} className={cn("absolute size-6 border-accent", corner)} />
              ))}
            </div>
          )}

          {boxed.length > 0 && showBoxes && (
            <motion.div
              variants={stagger(0.05)}
              initial="hidden"
              animate="visible"
              role="group"
              aria-label="Detections in screenshot"
              className="absolute inset-0"
            >
              {boxed.map(({ detection, number }) => {
                const box = detection.box!;
                const selected = detection.id === selectedId;
                const confidence = confidenceText(detection);
                const rightHalf = box.x + box.width / 2 > 0.5;
                const nearTop = box.y < 0.08;
                return (
                  <motion.button
                    key={detection.id}
                    variants={fadeIn}
                    type="button"
                    onClick={() => onSelect(detection.id)}
                    aria-pressed={selected}
                    aria-label={[`${number}. ${detection.label}`, confidence].filter(Boolean).join(", ")}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.width * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                    className={cn(
                      // Dimming is done with colour, not opacity: the fade-in animation owns the inline opacity.
                      "group absolute rounded-sm transition-[border-color,background-color] duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      selected
                        ? "z-20 border-2 border-accent bg-accent/10"
                        : cn(
                            "border hover:z-10 hover:border-accent/80 focus-visible:z-10",
                            anySelected ? "border-fg/15" : "border-fg/45",
                          ),
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1 left-1 flex size-5 items-center justify-center rounded-full text-[0.6875rem] leading-none font-semibold shadow-sm transition-opacity",
                        selected ? "bg-accent text-midnight" : "bg-midnight/85 text-fg group-hover:bg-accent group-hover:text-midnight",
                        anySelected && !selected && "opacity-40 group-hover:opacity-100",
                      )}
                    >
                      {number}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        // Hidden until hovered, focused or selected. Labels on the right half anchor to the box's
                        // right edge, and boxes touching the top get their label inside, so it never leaves the image.
                        "pointer-events-none absolute max-w-[min(16rem,80vw)] truncate rounded-sm px-1.5 py-0.5 text-left text-meta font-medium whitespace-nowrap",
                        nearTop ? "top-7" : "-top-1 -translate-y-full",
                        rightHalf ? "right-0" : "left-0",
                        selected
                          ? "block bg-accent text-midnight"
                          : "hidden bg-midnight/90 text-fg group-hover:block group-focus-visible:block",
                      )}
                    >
                      {detection.label}
                      {detection.confidence !== undefined && ` · ${Math.round(detection.confidence * 100)}%`}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function area(detection: Detection) {
  return detection.box ? detection.box.width * detection.box.height : 0;
}
