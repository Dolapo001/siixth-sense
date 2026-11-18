/*
 * Brand motion: the starburst as loader, reveal and recognition signal.
 * CSS-driven (keyframes in globals.css, prefixed ss-) so it renders on the
 * server and needs no JavaScript. Under reduced motion every animation
 * collapses to its end state, which is always the plain, complete symbol.
 */

import { cn } from "@/lib/utilities/cn";
import { STARBURST_GRID, starburstRays } from "./geometry";
import { SixthSenseSymbol, SixthSenseWordmark } from "./logo";

const rays = starburstRays();
const viewBox = `0 0 ${STARBURST_GRID} ${STARBURST_GRID}`;

type BrandLoaderProps = {
  size?: number;
  /** Announced to screen readers. Omit when a parent already announces loading. */
  label?: string;
  className?: string;
};

/**
 * Rays brighten one after another, clockwise: a scan, not a spin.
 * Use for page-level waits; inline waits should keep using skeletons.
 */
export function BrandLoader({ size = 40, label, className }: BrandLoaderProps) {
  return (
    <span role={label ? "status" : undefined} className={cn("inline-flex", className)}>
      <svg width={size} height={size} viewBox={viewBox} aria-hidden>
        {rays.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="var(--color-accent)"
            className="ss-loader-ray"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

type BrandRevealProps = {
  size?: number;
  /** Show the wordmark, which follows the symbol in. */
  withWordmark?: boolean;
  /** Seconds before the reveal starts (to sit inside a larger entrance sequence). */
  delay?: number;
  className?: string;
};

/**
 * One-time entrance: rays extend from the centre in sequence, a narrow band
 * of light passes across the symbol, then the wordmark settles in.
 * Decorative; give the surrounding element its accessible name.
 */
export function BrandReveal({ size = 40, withWordmark = false, delay = 0, className }: BrandRevealProps) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-[0.6em]", className)} style={{ fontSize: size * 0.5 }}>
      <span className="relative inline-flex">
        <svg width={size} height={size} viewBox={viewBox}>
          {rays.map((d, i) => (
            <path
              key={d}
              d={d}
              fill="var(--color-accent)"
              className="ss-reveal-ray"
              style={{ animationDelay: `${delay + i * 0.06}s` }}
            />
          ))}
        </svg>
        <span className="ss-light-pass absolute inset-0" style={{ animationDelay: `${delay + 0.75}s` }}>
          <SixthSenseSymbol size={size} tone="white" variant="regular" />
        </span>
      </span>
      {withWordmark && (
        <span className="ss-fade-in inline-flex" style={{ animationDelay: `${delay + 0.6}s` }}>
          <SixthSenseWordmark height={size * 0.5} />
        </span>
      )}
    </span>
  );
}

/**
 * The recognition signal: the symbol lights up once when something is
 * identified (e.g. an analysis completes with results). Decorative.
 */
export function SignalMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("ss-signal inline-flex", className)}>
      <SixthSenseSymbol size={size} />
    </span>
  );
}
