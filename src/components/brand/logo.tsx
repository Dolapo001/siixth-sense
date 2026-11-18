/*
 * Sixth Sense logo components. Every surface that shows the logo (UI,
 * favicon, Apple icon, OG image) imports from this folder, and the artwork
 * itself lives in geometry.ts. No page should embed logo paths directly.
 */

import { cn } from "@/lib/utilities/cn";
import {
  BRAND_NAME,
  SMALL_SYMBOL_MAX_PX,
  STARBURST_GRID,
  TAGLINE,
  starburstPath,
  taglineMark,
  wordmark,
  type StarburstVariant,
} from "./geometry";

/** cyan: primary. white / black: one-colour use. current: inherits text colour. */
export type SymbolTone = "cyan" | "white" | "black" | "current";

const toneFill: Record<SymbolTone, string> = {
  cyan: "var(--color-accent)",
  white: "var(--color-white)",
  black: "var(--color-midnight)",
  current: "currentColor",
};

type SixthSenseSymbolProps = {
  size?: number;
  tone?: SymbolTone;
  /** Optical size. Defaults to "small" at 24 px and below. */
  variant?: StarburstVariant;
  className?: string;
  /** Accessible name. Omit when the symbol sits next to visible brand text. */
  title?: string;
  /** Raw fill for contexts without CSS variables (ImageResponse). Overrides `tone`. */
  color?: string;
};

/** The starburst: the primary brand mark. */
export function SixthSenseSymbol({ size = 32, tone = "cyan", variant, className, title, color }: SixthSenseSymbolProps) {
  const resolved = variant ?? (size <= SMALL_SYMBOL_MAX_PX ? "small" : "regular");
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${STARBURST_GRID} ${STARBURST_GRID}`}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path fill={color ?? toneFill[tone]} fillRule="evenodd" d={starburstPath(resolved)} />
    </svg>
  );
}

type MarkProps = {
  /** Cap height in pixels. */
  height?: number;
  className?: string;
  /** Raw fill for contexts without CSS variables. Defaults to the text colour. */
  color?: string;
};

/** "SIXTH SENSE" in the brand's custom capitals. Decorative: pair it with an accessible name. */
export function SixthSenseWordmark({ height = 14, className, color = "currentColor" }: MarkProps) {
  return (
    <svg
      height={height}
      width={(height * wordmark.width) / wordmark.height}
      viewBox={`0 0 ${wordmark.width} ${wordmark.height}`}
      aria-hidden
      className={cn("shrink-0 text-fg", className)}
    >
      <path fill={color} d={wordmark.d} />
    </svg>
  );
}

/** "SEE BEYOND THE SCENE." set in the brand capitals. Decorative, like the wordmark. */
export function SixthSenseTaglineMark({ height = 8, className, color = "currentColor" }: MarkProps) {
  return (
    <svg
      height={height}
      width={(height * taglineMark.width) / taglineMark.height}
      viewBox={`0 0 ${taglineMark.width} ${taglineMark.height}`}
      aria-hidden
      className={cn("shrink-0 text-accent", className)}
    >
      <path fill={color} d={taglineMark.d} />
    </svg>
  );
}

/** brand: cyan symbol, off-white wordmark (dark backgrounds). light / dark: one colour. */
export type LogoTone = "brand" | "light" | "dark";

type SixthSenseLogoProps = {
  /** Symbol size in pixels. The wordmark scales from it. */
  size?: number;
  layout?: "horizontal" | "stacked";
  /** Stacked layout only: add the tagline beneath the wordmark. */
  tagline?: boolean;
  tone?: LogoTone;
  /** Hide the wordmark (e.g. collapsed navigation). The symbol then carries the accessible name. */
  symbolOnly?: boolean;
  className?: string;
};

const logoTones: Record<LogoTone, { symbol: SymbolTone; word: string }> = {
  brand: { symbol: "cyan", word: "text-fg" },
  light: { symbol: "white", word: "text-white" },
  dark: { symbol: "black", word: "text-midnight" },
};

/** Symbol + wordmark lockup. Screen readers hear "Sixth Sense". */
export function SixthSenseLogo({
  size = 28,
  layout = "horizontal",
  tagline = false,
  tone = "brand",
  symbolOnly = false,
  className,
}: SixthSenseLogoProps) {
  const colors = logoTones[tone];
  if (symbolOnly) {
    return <SixthSenseSymbol size={size} tone={colors.symbol} className={className} title={BRAND_NAME} />;
  }

  const stacked = layout === "stacked";
  return (
    <span
      className={cn(
        "inline-flex items-center",
        stacked ? "flex-col gap-[0.6em]" : "gap-[0.6em]",
        className,
      )}
      // em-based gaps follow the wordmark's cap height.
      style={{ fontSize: size * 0.5 }}
    >
      <span className="sr-only">{stacked && tagline ? `${BRAND_NAME}. ${TAGLINE}` : BRAND_NAME}</span>
      <SixthSenseSymbol size={stacked ? size * 1.2 : size} tone={colors.symbol} />
      <SixthSenseWordmark height={size * 0.5} className={colors.word} />
      {stacked && tagline && (
        <SixthSenseTaglineMark height={size * 0.21} className={tone === "brand" ? "text-accent" : colors.word} />
      )}
    </span>
  );
}
