// Generates the Sixth Sense logo files in public/brand/ (and the favicon at
// src/app/icon.svg) from the shared geometry in src/components/brand/geometry.ts,
// so the files can never drift from the logo the app renders.
//
// Run after changing the geometry: `pnpm brand:assets`. Output is committed.
// Needs Node 22.18+ (runs the TypeScript geometry file directly).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  STARBURST_GRID,
  starburstPath,
  starburstRays,
  taglineMark,
  wordmark,
} from "../src/components/brand/geometry.ts";

const colors = {
  cyan: "#55D6D0",
  offWhite: "#F2F4F5",
  midnight: "#0B1018",
  white: "#FFFFFF",
};

const outDir = join(process.cwd(), "public", "brand");
mkdirSync(outDir, { recursive: true });

const n = (value) => Math.round(value * 100) / 100;

function svg({ width, height, title, body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" role="img">`,
    `<title>${title}</title>`,
    body,
    "</svg>",
    "",
  ].join("\n");
}

/** The starburst at a given size and position. */
function symbol({ size, x = 0, y = 0, fill, variant = "regular" }) {
  const scale = size / STARBURST_GRID;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${Number(scale.toFixed(4))})" fill="${fill}" fill-rule="evenodd" d="${starburstPath(variant)}"/>`;
}

/** A set line of capitals at a given cap height. */
function caps(mark, { capHeight, x = 0, y = 0, fill }) {
  const scale = capHeight / mark.height;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${Number(scale.toFixed(4))})" fill="${fill}" d="${mark.d}"/>`;
}

const files = {};

/* Symbols ------------------------------------------------------------------ */

const symbolFile = (fill, variant = "regular") =>
  svg({
    width: STARBURST_GRID,
    height: STARBURST_GRID,
    title: "Sixth Sense",
    body: symbol({ size: STARBURST_GRID, fill, variant }),
  });

files["sixth-sense-symbol.svg"] = symbolFile(colors.cyan);
files["sixth-sense-symbol-light.svg"] = symbolFile(colors.white);
files["sixth-sense-symbol-dark.svg"] = symbolFile(colors.midnight);
files["sixth-sense-symbol-small.svg"] = symbolFile(colors.cyan, "small");

/* Wordmark ----------------------------------------------------------------- */

files["sixth-sense-wordmark.svg"] = svg({
  width: wordmark.width,
  height: wordmark.height,
  title: "Sixth Sense",
  body: caps(wordmark, { capHeight: wordmark.height, fill: colors.offWhite }),
});

/* Horizontal lockup -------------------------------------------------------- */

// Symbol box is 2× the cap height; the gap is 0.6× the cap height.
const CAP = 20;
const LOCKUP_SYMBOL = CAP * 2;
const LOCKUP_GAP = CAP * 0.6;
const lockupWidth = LOCKUP_SYMBOL + LOCKUP_GAP + wordmark.width * (CAP / wordmark.height);

const lockup = (symbolFill, wordFill) =>
  svg({
    width: lockupWidth,
    height: LOCKUP_SYMBOL,
    title: "Sixth Sense",
    body: [
      symbol({ size: LOCKUP_SYMBOL, fill: symbolFill }),
      caps(wordmark, { capHeight: CAP, x: LOCKUP_SYMBOL + LOCKUP_GAP, y: (LOCKUP_SYMBOL - CAP) / 2, fill: wordFill }),
    ].join("\n"),
  });

files["sixth-sense-logo.svg"] = lockup(colors.cyan, colors.offWhite);
files["sixth-sense-logo-light.svg"] = lockup(colors.white, colors.white);
files["sixth-sense-logo-dark.svg"] = lockup(colors.midnight, colors.midnight);

/* Stacked lockup with tagline --------------------------------------------- */

const TAG_CAP = CAP * 0.42;
const tagWidth = taglineMark.width * (TAG_CAP / taglineMark.height);
const stackedWidth = Math.max(wordmark.width, tagWidth);
const STACK_SYMBOL = CAP * 2.4;
const STACK_GAP = CAP * 0.6;
const stackedHeight = STACK_SYMBOL + STACK_GAP + CAP + STACK_GAP + TAG_CAP;

files["sixth-sense-logo-stacked.svg"] = svg({
  width: stackedWidth,
  height: stackedHeight,
  title: "Sixth Sense. See beyond the scene.",
  body: [
    symbol({ size: STACK_SYMBOL, x: (stackedWidth - STACK_SYMBOL) / 2, fill: colors.cyan }),
    caps(wordmark, { capHeight: CAP, x: (stackedWidth - wordmark.width) / 2, y: STACK_SYMBOL + STACK_GAP, fill: colors.offWhite }),
    caps(taglineMark, {
      capHeight: TAG_CAP,
      x: (stackedWidth - tagWidth) / 2,
      y: STACK_SYMBOL + STACK_GAP * 2 + CAP,
      fill: colors.cyan,
    }),
  ].join("\n"),
});

/* App icon, favicon, social avatar ----------------------------------------- */

/** Midnight plate with the symbol centred. `radius` 0 = square (platforms crop it). */
function plate({ size, radius, symbolRatio, variant, title }) {
  const s = size * symbolRatio;
  return svg({
    width: size,
    height: size,
    title,
    body: [
      `<rect width="${size}" height="${size}" rx="${radius}" fill="${colors.midnight}"/>`,
      symbol({ size: s, x: (size - s) / 2, y: (size - s) / 2, fill: colors.cyan, variant }),
    ].join("\n"),
  });
}

files["sixth-sense-app-icon.svg"] = plate({ size: 512, radius: 112, symbolRatio: 0.72, variant: "regular", title: "Sixth Sense" });
files["sixth-sense-social.svg"] = plate({ size: 400, radius: 0, symbolRatio: 0.6, variant: "regular", title: "Sixth Sense" });
const favicon = plate({ size: 48, radius: 10, symbolRatio: 0.92, variant: "small", title: "Sixth Sense" });
files["favicon.svg"] = favicon;

/* Loader ------------------------------------------------------------------- */

// Rays brighten one after another, clockwise. Static and fully lit when the
// viewer prefers reduced motion.
files["sixth-sense-loader.svg"] = svg({
  width: STARBURST_GRID,
  height: STARBURST_GRID,
  title: "Loading",
  body: [
    "<style>",
    "path{animation:ray 1.6s ease-in-out infinite;opacity:.3}",
    ...starburstRays().map((_, i) => `path:nth-of-type(${i + 1}){animation-delay:${n(i * 0.2)}s}`),
    "@keyframes ray{0%,100%{opacity:.3}25%{opacity:1}}",
    "@media (prefers-reduced-motion:reduce){path{animation:none;opacity:1}}",
    "</style>",
    ...starburstRays().map((d) => `<path fill="${colors.cyan}" d="${d}"/>`),
  ].join("\n"),
});

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content);
}
writeFileSync(join(process.cwd(), "src", "app", "icon.svg"), favicon);

console.log(`${Object.keys(files).length} brand files → public/brand/, favicon → src/app/icon.svg`);
