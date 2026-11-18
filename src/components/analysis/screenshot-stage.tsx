"use client";

import { motion } from "motion/react";
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
 */
export function ScreenshotStage({ src, alt, scanning, detections, selectedId, onSelect }: ScreenshotStageProps) {
  const boxed = detections.filter((d) => d.box);

  return (
    <div className="flex justify-center self-start rounded-lg border border-border bg-surface p-2">
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

        {boxed.length > 0 && (
          <motion.div
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
            role="group"
            aria-label="Detections in screenshot"
            className="absolute inset-0"
          >
            {boxed.map((detection) => {
              const box = detection.box!;
              const selected = detection.id === selectedId;
              const confidence = confidenceText(detection);
              return (
                <motion.button
                  key={detection.id}
                  variants={fadeIn}
                  type="button"
                  onClick={() => onSelect(detection.id)}
                  aria-pressed={selected}
                  aria-label={[detection.label, confidence].filter(Boolean).join(", ")}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                  }}
                  className={cn(
                    "absolute rounded-sm border-2 transition-colors",
                    selected ? "z-10 border-accent bg-accent/10" : "border-fg/70 hover:border-accent/80",
                  )}
                >
                  <span
                    className={cn(
                      // Labels on the right half anchor to the box's right edge so they never run off the image.
                      "absolute -top-0.5 max-w-[min(16rem,80vw)] -translate-y-full truncate rounded-t-sm px-1.5 py-0.5 text-left text-meta font-medium",
                      box.x + box.width / 2 > 0.5 ? "right-[-2px]" : "left-[-2px]",
                      selected ? "bg-accent text-midnight" : "bg-midnight/85 text-fg",
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
  );
}
