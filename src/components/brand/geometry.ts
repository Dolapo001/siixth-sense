/*
 * Sixth Sense brand geometry — the single source for every logo surface.
 *
 * The React components (logo.tsx), generated icons (brand-images.tsx) and the
 * static SVG files in public/brand/ (scripts/generate-brand-assets.ts) all
 * draw from these paths. Change the mark here, then run
 * `pnpm brand:assets` to regenerate the files.
 *
 * This file must stay dependency-free so Node can run it directly.
 * Construction is documented in docs/brand-guidelines.md.
 */

/* ------------------------------------------------------------------------ */
/* Starburst                                                                 */
/* ------------------------------------------------------------------------ */

/** The symbol is drawn on a 48 × 48 grid, centred at (24, 24). */
export const STARBURST_GRID = 48;
const C = STARBURST_GRID / 2;

export type StarburstVariant = "regular" | "small";

type StarburstSpec = {
  /** Ray lengths from the centre: north/south, east/west, diagonals. */
  vertical: number;
  horizontal: number;
  diagonal: number;
  /** Radius of the notches between rays. Sets how thick each ray is at its root. */
  valley: number;
  /** Half-diagonal of the square aperture cut from the centre (0 = none). */
  aperture: number;
};

/**
 * Two optical sizes of the same mark.
 * - regular: 32 px and up. Slender rays and an open centre.
 * - small: 16–24 px. Heavier roots and no aperture, so it doesn't fill in.
 */
const specs: Record<StarburstVariant, StarburstSpec> = {
  regular: { vertical: 22, horizontal: 20, diagonal: 17, valley: 3.6, aperture: 1.8 },
  small: { vertical: 22, horizontal: 21, diagonal: 19, valley: 5, aperture: 0 },
};

/** Below this rendered size, components switch to the small variant. */
export const SMALL_SYMBOL_MAX_PX = 24;

const round = (n: number) => Math.round(n * 100) / 100;
const polar = (r: number, deg: number) => {
  // 0° points north; angles run clockwise on screen.
  const rad = (deg * Math.PI) / 180;
  return [round(C + r * Math.sin(rad)), round(C - r * Math.cos(rad))] as const;
};

function rayLength(spec: StarburstSpec, index: number) {
  if (index % 2 === 1) return spec.diagonal;
  return index % 4 === 0 ? spec.vertical : spec.horizontal;
}

/**
 * The starburst as one closed 16-point polygon (tips alternating with
 * notches), plus an optional square aperture. Render with fill-rule="evenodd".
 */
export function starburstPath(variant: StarburstVariant = "regular") {
  const spec = specs[variant];
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const [tx, ty] = polar(rayLength(spec, i), i * 45);
    const [vx, vy] = polar(spec.valley, i * 45 + 22.5);
    points.push(`${tx} ${ty}`, `${vx} ${vy}`);
  }
  let d = `M${points.join("L")}Z`;
  if (spec.aperture > 0) {
    const a = spec.aperture;
    d += `M${C} ${C - a}L${C + a} ${C}L${C} ${C + a}L${C - a} ${C}Z`;
  }
  return d;
}

/**
 * Each ray as its own path (root at the centre), in clockwise order from
 * north. Used by the loader and reveal animations to light rays in sequence.
 * Together they cover the same silhouette as starburstPath("regular"), minus
 * the aperture.
 */
export function starburstRays(variant: StarburstVariant = "regular") {
  const spec = specs[variant];
  return Array.from({ length: 8 }, (_, i) => {
    const [tx, ty] = polar(rayLength(spec, i), i * 45);
    const [ax, ay] = polar(spec.valley, i * 45 - 22.5);
    const [bx, by] = polar(spec.valley, i * 45 + 22.5);
    return `M${C} ${C}L${ax} ${ay}L${tx} ${ty}L${bx} ${by}Z`;
  });
}

/* ------------------------------------------------------------------------ */
/* Lettering                                                                 */
/* ------------------------------------------------------------------------ */

/*
 * Custom geometric capitals, drawn on a 20-unit cap height with a 3.6-unit
 * stem. Only the letters the brand needs are drawn. Every path uses absolute
 * M/L/H/V/A/Z commands so it can be shifted along x without a parser library.
 */
export const CAP_HEIGHT = 20;

type Glyph = { width: number; d: string };

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}H${round(x + w)}V${round(y + h)}H${x}Z`;

const glyphs: Record<string, Glyph> = {
  S: {
    width: 14,
    d: "M12.6 0H5.9A5.9 5.9 0 0 0 5.9 11.8H8.1A2.3 2.3 0 0 1 8.1 16.4H1.4V20H8.1A5.9 5.9 0 0 0 8.1 8.2H5.9A2.3 2.3 0 0 1 5.9 3.6H12.6Z",
  },
  I: { width: 3.6, d: rect(0, 0, 3.6, 20) },
  X: { width: 14, d: "M0 0H4L14 20H10ZM10 0H14L4 20H0Z" },
  T: { width: 14, d: rect(0, 0, 14, 3.6) + rect(5.2, 0, 3.6, 20) },
  H: { width: 14, d: rect(0, 0, 3.6, 20) + rect(10.4, 0, 3.6, 20) + rect(0, 8.2, 14, 3.6) },
  E: { width: 12, d: rect(0, 0, 3.6, 20) + rect(0, 0, 12, 3.6) + rect(0, 8.2, 11, 3.6) + rect(0, 16.4, 12, 3.6) },
  N: { width: 14, d: rect(0, 0, 3.6, 20) + rect(10.4, 0, 3.6, 20) + "M0 0H4.6L14 20H9.4Z" },
  B: {
    width: 13.5,
    d: "M0 0H7.6A5.9 5.9 0 0 1 11.84 10A5.9 5.9 0 0 1 7.6 20H0ZM3.6 3.6V8.2H7.6A2.3 2.3 0 0 0 7.6 3.6ZM3.6 11.8V16.4H7.6A2.3 2.3 0 0 0 7.6 11.8Z",
  },
  Y: { width: 15, d: "M0 0H4.2L9.3 11.2H5.7ZM10.8 0H15L9.3 11.2H5.7Z" + rect(5.7, 10, 3.6, 10) },
  O: {
    width: 20,
    d: "M10 0A10 10 0 1 1 10 20A10 10 0 1 1 10 0ZM10 3.6A6.4 6.4 0 1 0 10 16.4A6.4 6.4 0 1 0 10 3.6Z",
  },
  D: { width: 16, d: "M0 0H6A10 10 0 0 1 6 20H0ZM3.6 3.6V16.4H6A6.4 6.4 0 0 0 6 3.6Z" },
  C: {
    width: 17.07,
    d: "M17.07 2.93A10 10 0 1 0 17.07 17.07L14.53 14.53A6.4 6.4 0 1 1 14.53 5.47Z",
  },
  ".": { width: 3.6, d: rect(0, 16.4, 3.6, 3.6) },
};

/** Arguments per command, and which of them are x coordinates. */
const commandShape: Record<string, { args: number; x: number[] }> = {
  M: { args: 2, x: [0] },
  L: { args: 2, x: [0] },
  H: { args: 1, x: [0] },
  V: { args: 1, x: [] },
  A: { args: 7, x: [5] },
  Z: { args: 0, x: [] },
};

function shiftX(d: string, dx: number) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let out = "";
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    const shape = commandShape[cmd];
    if (!shape) throw new Error(`Unsupported path command "${cmd}"`);
    const args = tokens.slice(i, i + shape.args).map(Number);
    i += shape.args;
    shape.x.forEach((index) => (args[index] = round(args[index] + dx)));
    out += cmd + args.join(" ");
  }
  return out;
}

/** Optical kerning, in units, for pairs that look too loose at even spacing. */
const kerning: Record<string, number> = { XT: -0.6, TH: 0.2, BE: 0.2, OY: -0.4, YO: -0.4, ON: -0.2, DT: -0.2, "E.": -0.6 };

type SetOptions = { tracking: number; wordSpace: number };

/** Sets a line of capitals as one path. Returns its path and width in units. */
export function setCaps(text: string, { tracking, wordSpace }: SetOptions) {
  let x = 0;
  let d = "";
  const chars = [...text];
  chars.forEach((char, index) => {
    if (char === " ") {
      x += wordSpace;
      return;
    }
    const glyph = glyphs[char];
    if (!glyph) throw new Error(`No glyph drawn for "${char}"`);
    d += shiftX(glyph.d, x);
    x += glyph.width;
    const next = chars[index + 1];
    if (next && next !== " ") x += tracking + (kerning[char + next] ?? 0);
  });
  return { d, width: round(x), height: CAP_HEIGHT };
}

export const BRAND_NAME = "Sixth Sense";
export const TAGLINE = "See beyond the scene.";

/** "SIXTH SENSE", set for the logo lockups. */
export const wordmark = setCaps("SIXTH SENSE", { tracking: 4.2, wordSpace: 11 });

/** "SEE BEYOND THE SCENE.", set wider for use beneath the wordmark. */
export const taglineMark = setCaps("SEE BEYOND THE SCENE.", { tracking: 5, wordSpace: 13 });
