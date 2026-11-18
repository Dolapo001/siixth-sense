// Generates the Sixth Sense marketing kit in public/brand/marketing/: PNG
// exports of the logo and banners sized for social platforms, all drawn from
// the shared geometry in src/components/brand/geometry.ts and the original
// landing artwork in public/landing/ (no game material).
//
// Run: `pnpm brand:marketing`. Writes an SVG master for every file and, when
// `rsvg-convert` (librsvg) is installed, the PNG next to it.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  STARBURST_GRID,
  starburstPath,
  taglineMark,
  wordmark,
} from "../src/components/brand/geometry.ts";

const colors = {
  cyan: "#55D6D0",
  offWhite: "#F2F4F5",
  midnight: "#0B1018",
  white: "#FFFFFF",
};

const root = process.cwd();
const outDir = join(root, "public", "brand", "marketing");
mkdirSync(join(outDir, "logos"), { recursive: true });
mkdirSync(join(outDir, "banners"), { recursive: true });

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

function symbol({ size, x = 0, y = 0, fill }) {
  const scale = size / STARBURST_GRID;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${Number(scale.toFixed(4))})" fill="${fill}" fill-rule="evenodd" d="${starburstPath()}"/>`;
}

function caps(mark, { capHeight, x = 0, y = 0, fill }) {
  const scale = capHeight / mark.height;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${Number(scale.toFixed(4))})" fill="${fill}" d="${mark.d}"/>`;
}

/* Lockups, at any cap height (same proportions as scripts/generate-brand-assets.mjs) */

function horizontal({ cap, x, y, symbolFill, wordFill }) {
  const size = cap * 2;
  const width = size + cap * 0.6 + wordmark.width * (cap / wordmark.height);
  return {
    width,
    height: size,
    body: [
      symbol({ size, x, y, fill: symbolFill }),
      caps(wordmark, { capHeight: cap, x: x + size + cap * 0.6, y: y + (size - cap) / 2, fill: wordFill }),
    ].join("\n"),
  };
}

/** Stacked lockup centred on `cx`, top at `y`. */
function stacked({ cap, cx, y, tagline = true, symbolFill = colors.cyan, wordFill = colors.offWhite, tagFill = colors.cyan }) {
  const size = cap * 2.4;
  const gap = cap * 0.6;
  const tagCap = cap * 0.42;
  const wordW = wordmark.width * (cap / wordmark.height);
  const tagW = taglineMark.width * (tagCap / taglineMark.height);
  const parts = [
    symbol({ size, x: cx - size / 2, y, fill: symbolFill }),
    caps(wordmark, { capHeight: cap, x: cx - wordW / 2, y: y + size + gap, fill: wordFill }),
  ];
  if (tagline) parts.push(caps(taglineMark, { capHeight: tagCap, x: cx - tagW / 2, y: y + size + gap * 2 + cap, fill: tagFill }));
  return {
    width: Math.max(wordW, tagline ? tagW : 0),
    height: size + gap + cap + (tagline ? gap + tagCap : 0),
    body: parts.join("\n"),
  };
}

/* Background art ------------------------------------------------------------ */

// The landing skyline, nested so it can be cropped ("slice") to any banner.
const skyline = readFileSync(join(root, "public", "landing", "skyline-night.svg"), "utf8");
const skylineInner = skyline.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const ART = { width: 1920, height: 1080 };
// The tall tower at the centre of the art (art units), used for the detection frame.
const TOWER = { x: 918, y: 280, width: 86, height: 400 };

function art({ width, height, align = "xMidYMid" }) {
  // Work out where the art lands so overlays can follow it.
  const scale = Math.max(width / ART.width, height / ART.height);
  const ox = align.startsWith("xMid") ? (width - ART.width * scale) / 2 : 0;
  const oy = align.endsWith("YMax") ? height - ART.height * scale : align.endsWith("YMid") ? (height - ART.height * scale) / 2 : 0;
  const map = (r) => ({ x: ox + r.x * scale, y: oy + r.y * scale, width: r.width * scale, height: r.height * scale });
  const body = `<svg x="0" y="0" width="${width}" height="${height}" viewBox="0 0 ${ART.width} ${ART.height}" preserveAspectRatio="${align} slice">${skylineInner}</svg>`;
  return { body, map, scale };
}

/** Corner brackets, as the analysis UI marks an identified entity. */
function detectionFrame({ x, y, width, height, stroke }) {
  const len = Math.min(width, height) * 0.22;
  const sw = Math.max(2, stroke);
  const corners = [
    `M${x} ${y + len}V${y}H${x + len}`,
    `M${x + width - len} ${y}H${x + width}V${y + len}`,
    `M${x + width} ${y + height - len}V${y + height}H${x + width - len}`,
    `M${x + len} ${y + height}H${x}V${y + height - len}`,
  ].map((d) => d.replace(/(\d+\.\d{3,})/g, (m) => n(Number(m))));
  const mark = Math.max(18, width * 0.32);
  return [
    `<path d="${corners.join("")}" fill="none" stroke="${colors.cyan}" stroke-width="${n(sw)}" stroke-linecap="square"/>`,
    symbol({ size: mark, x: x + width - mark / 2, y: y - mark / 2, fill: colors.cyan }),
  ].join("\n");
}

function shade(id, stops, { x1 = 0, y1 = 0, x2 = 1, y2 = 0 } = {}) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, a]) => `<stop offset="${o}" stop-color="${colors.midnight}" stop-opacity="${a}"/>`)
    .join("")}</linearGradient>`;
}

/**
 * A banner. `layout`:
 * - "left": horizontal lockup + tagline on the left over a dark fade, detection frame on the tower.
 * - "center": stacked lockup centred over a darkened scene.
 */
function banner({ width, height, layout, cap, align = "xMidYMid", title = "Sixth Sense. See beyond the scene." }) {
  const bg = art({ width, height, align });
  const defs = [];
  const layers = [`<rect width="${width}" height="${height}" fill="${colors.midnight}"/>`, bg.body];

  if (layout === "left") {
    defs.push(shade("mk-fade", [[0, 0.96], [0.38, 0.9], [0.62, 0.35], [1, 0.15]]));
    layers.push(`<rect width="${width}" height="${height}" fill="url(#mk-fade)"/>`);
    const tower = bg.map(TOWER);
    const pad = tower.width * 0.18;
    const frame = { x: tower.x - pad, y: tower.y - pad, width: tower.width + pad * 2, height: tower.height + pad * 2 };
    // Very wide crops cut the tower off; leave the frame out rather than clip it.
    if (frame.y > height * 0.08 && frame.y + frame.height < height * 0.95) {
      layers.push(detectionFrame({ ...frame, stroke: height / 260 }));
    }
    const margin = Math.round(height * 0.14);
    const lock = horizontal({ cap, x: margin, y: 0, symbolFill: colors.cyan, wordFill: colors.offWhite });
    const tagCap = cap * 0.42;
    const blockH = lock.height + cap * 0.55 + tagCap;
    const top = (height - blockH) / 2;
    const placed = horizontal({ cap, x: margin, y: top, symbolFill: colors.cyan, wordFill: colors.offWhite });
    layers.push(placed.body);
    // Tagline aligned with the wordmark's left edge.
    layers.push(caps(taglineMark, { capHeight: tagCap, x: margin + cap * 2.6, y: top + lock.height + cap * 0.55, fill: colors.cyan }));
  } else {
    defs.push(shade("mk-veil", [[0, 0.4], [0.5, 0.7], [1, 0.45]], { x2: 0, y2: 1 }));
    layers.push(`<rect width="${width}" height="${height}" fill="url(#mk-veil)"/>`);
    const probe = stacked({ cap, cx: 0, y: 0 });
    layers.push(stacked({ cap, cx: width / 2, y: (height - probe.height) / 2 }).body);
  }

  return svg({ width, height, title, body: [`<defs>${defs.join("")}</defs>`, ...layers].join("\n") });
}

const files = {};

/* Logos (transparent, large) ----------------------------------------------- */

const logoFile = (lock, w, h, title = "Sixth Sense") => svg({ width: w, height: h, title, body: lock.body });

for (const [suffix, sym, word] of [
  ["", colors.cyan, colors.offWhite],
  ["-light", colors.white, colors.white],
  ["-dark", colors.midnight, colors.midnight],
]) {
  const l = horizontal({ cap: 100, x: 0, y: 0, symbolFill: sym, wordFill: word });
  files[`logos/sixth-sense-logo${suffix}.svg`] = logoFile(l, l.width, l.height);
  const probe = stacked({ cap: 100, cx: 0, y: 0 });
  const s = stacked({ cap: 100, cx: probe.width / 2, y: 0, symbolFill: sym, wordFill: word, tagFill: suffix ? word : colors.cyan });
  files[`logos/sixth-sense-logo-stacked${suffix}.svg`] = logoFile(s, s.width, s.height, "Sixth Sense. See beyond the scene.");
  files[`logos/sixth-sense-symbol${suffix || ""}.svg`] = svg({
    width: 1024,
    height: 1024,
    title: "Sixth Sense",
    body: symbol({ size: 1024, fill: sym }),
  });
}

// Logo on a Midnight plate with clear space, for places that need a background.
{
  const l = horizontal({ cap: 100, x: 0, y: 0, symbolFill: colors.cyan, wordFill: colors.offWhite });
  const pad = 100;
  const placed = horizontal({ cap: 100, x: pad, y: pad, symbolFill: colors.cyan, wordFill: colors.offWhite });
  files["logos/sixth-sense-logo-on-midnight.svg"] = svg({
    width: l.width + pad * 2,
    height: l.height + pad * 2,
    title: "Sixth Sense",
    body: `<rect width="100%" height="100%" fill="${colors.midnight}"/>\n${placed.body}`,
  });
}

// Profile picture / app icon: symbol on a square Midnight plate (platforms crop to a circle).
files["logos/sixth-sense-avatar.svg"] = svg({
  width: 1024,
  height: 1024,
  title: "Sixth Sense",
  body: `<rect width="1024" height="1024" fill="${colors.midnight}"/>\n${symbol({ size: 600, x: 212, y: 212, fill: colors.cyan })}`,
});

/* Banners ------------------------------------------------------------------- */

// X: the profile picture covers the lower left, so keep the lockup centred.
files["banners/x-header-1500x500.svg"] = banner({ width: 1500, height: 500, layout: "center", cap: 46 });
files["banners/open-graph-1200x630.svg"] = banner({ width: 1200, height: 630, layout: "left", cap: 34 });
files["banners/linkedin-cover-1584x396.svg"] = banner({ width: 1584, height: 396, layout: "left", cap: 34 });
files["banners/discord-banner-960x540.svg"] = banner({ width: 960, height: 540, layout: "center", cap: 40 });
files["banners/youtube-banner-2560x1440.svg"] = banner({ width: 2560, height: 1440, layout: "center", cap: 64 });
files["banners/square-post-1080x1080.svg"] = banner({ width: 1080, height: 1080, layout: "center", cap: 52 });
files["banners/wide-1920x1080.svg"] = banner({ width: 1920, height: 1080, layout: "left", cap: 56 });

/* Write --------------------------------------------------------------------- */

let rsvg = true;
try {
  execFileSync("rsvg-convert", ["--version"], { stdio: "ignore" });
} catch {
  rsvg = false;
}

// PNG widths for the logo files (banners render at their own size).
const logoPngWidth = (name) => (name.includes("symbol") || name.includes("avatar") ? 1024 : 2400);

for (const [name, content] of Object.entries(files)) {
  const path = join(outDir, name);
  writeFileSync(path, content);
  if (!rsvg) continue;
  const args = name.startsWith("logos/") ? ["-w", String(logoPngWidth(name))] : [];
  execFileSync("rsvg-convert", [...args, path, "-o", path.replace(/\.svg$/, ".png")]);
}

console.log(
  `${Object.keys(files).length} marketing files → public/brand/marketing/` +
    (rsvg ? " (SVG + PNG)" : " (SVG only: install librsvg for PNGs)"),
);
