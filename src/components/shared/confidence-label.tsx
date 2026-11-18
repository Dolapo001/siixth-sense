import { cn } from "@/lib/utilities/cn";
import type { ConfidenceLevel } from "@/types/intelligence";

/**
 * Placeholder thresholds for a 0–1 score. The backend's scale and bands are
 * unknown; if it returns its own level, pass `level` instead of `score`.
 */
export const confidenceThresholds = { high: 0.8, moderate: 0.5 } as const;

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= confidenceThresholds.high) return "high";
  if (score >= confidenceThresholds.moderate) return "moderate";
  return "low";
}

const config: Record<ConfidenceLevel, { label: string; bars: number; color: string }> = {
  high: { label: "High confidence", bars: 3, color: "text-accent" },
  moderate: { label: "Moderate confidence", bars: 2, color: "text-fg" },
  low: { label: "Low confidence", bars: 1, color: "text-muted" },
};

type ConfidenceLabelProps = {
  /** Score from 0 to 1. Shown as a percentage when present. */
  score?: number;
  /** Level from the backend. Takes priority over a level derived from `score`. */
  level?: ConfidenceLevel;
  className?: string;
};

export function ConfidenceLabel({ score, level, className }: ConfidenceLabelProps) {
  const resolved = level ?? (score !== undefined ? getConfidenceLevel(score) : undefined);
  if (!resolved) return null;
  const { label, bars, color } = config[resolved];

  return (
    <span className={cn("inline-flex items-center gap-2 text-small", color, className)} data-level={resolved}>
      <span aria-hidden className="flex h-3 items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn("w-1 rounded-[1px]", bar <= bars ? "bg-current" : "bg-border")}
            style={{ height: `${bar * 33}%` }}
          />
        ))}
      </span>
      <span>{label}</span>
      {score !== undefined && <span className="meta text-muted">{Math.round(score * 100)}%</span>}
    </span>
  );
}
