// Generates Sixth Sense's original landing-page artwork as SVG files in public/landing/.
//
// These are independently drawn, fictional coastal-city scenes ("game-inspired",
// not taken from any game). They're temporary until licensed photography or
// commissioned renders replace them; see docs/landing-assets.md.
//
// Subjects (car, tower, flamingo) are placed at fixed positions so the landing
// page's demo detection boxes line up with them. If you move a subject here,
// update SUBJECTS in src/features/landing/fixtures.ts.
//
// Run: node scripts/generate-landing-art.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "landing");

function rng(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n) => Math.round(n * 10) / 10;

const palettes = {
  sunset: {
    sky: ["#141a33", "#3b2a4f", "#8a4560", "#d9725a", "#f2a65e"],
    sun: "#ffd29a",
    haze: "#f29b52",
    far: "#3a2f4c",
    mid: "#1d1b2e",
    near: "#0b1018",
    water: ["#3b2c47", "#1a1a2a", "#0b1018"],
    lights: ["#ffcf8a", "#ffe0b0", "#55d6d0"],
  },
  dusk: {
    sky: ["#0d1426", "#22284a", "#4b3a63", "#a65a72", "#d98a6a"],
    sun: "#f6b585",
    haze: "#c0687a",
    far: "#2c2945",
    mid: "#171a2d",
    near: "#0a0f17",
    water: ["#2a2640", "#141726", "#0a0f17"],
    lights: ["#ffd08a", "#ffe6c2", "#55d6d0", "#f29b52"],
  },
  night: {
    sky: ["#05080f", "#0a1020", "#121c33", "#1e2547", "#3a2e55"],
    sun: null,
    haze: "#55d6d0",
    far: "#151c30",
    mid: "#0f1524",
    near: "#070b12",
    water: ["#111a2c", "#0b1120", "#05080f"],
    lights: ["#55d6d0", "#ffd08a", "#f29b52", "#9fe8e4"],
  },
};

function defs(p, id) {
  const stops = p.sky.map((c, i) => `<stop offset="${r((i / (p.sky.length - 1)) * 100)}%" stop-color="${c}"/>`).join("");
  const water = p.water.map((c, i) => `<stop offset="${i * 50}%" stop-color="${c}"/>`).join("");
  return `<defs>
  <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
  <linearGradient id="${id}-water" x1="0" y1="0" x2="0" y2="1">${water}</linearGradient>
  <radialGradient id="${id}-sun" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${p.sun ?? "#000"}" stop-opacity="1"/>
    <stop offset="35%" stop-color="${p.sun ?? "#000"}" stop-opacity=".55"/>
    <stop offset="100%" stop-color="${p.sun ?? "#000"}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.haze}" stop-opacity="0"/>
    <stop offset="70%" stop-color="${p.haze}" stop-opacity=".28"/>
    <stop offset="100%" stop-color="${p.haze}" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="${id}-vignette" cx="50%" cy="45%" r="75%">
    <stop offset="60%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity=".55"/>
  </radialGradient>
  <radialGradient id="${id}-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#fff" stop-opacity=".9"/>
    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;
}

function skyline(rand, { x0, x1, baseY, minH, maxH, color, windows, lights, density = 1 }) {
  let out = "";
  let x = x0;
  while (x < x1) {
    const w = 26 + rand() * 70;
    const h = minH + Math.pow(rand(), 1.6) * (maxH - minH);
    const top = baseY - h;
    out += `<rect x="${r(x)}" y="${r(top)}" width="${r(w)}" height="${r(h + 2)}" fill="${color}"/>`;
    if (rand() < 0.25) {
      // stepped crown
      out += `<rect x="${r(x + w * 0.25)}" y="${r(top - h * 0.08)}" width="${r(w * 0.5)}" height="${r(h * 0.08 + 1)}" fill="${color}"/>`;
    }
    if (windows) {
      for (let wy = top + 8; wy < baseY - 6; wy += 9) {
        for (let wx = x + 5; wx < x + w - 5; wx += 8) {
          if (rand() < 0.16 * density) {
            const c = lights[Math.floor(rand() * lights.length)];
            out += `<rect x="${r(wx)}" y="${r(wy)}" width="3.2" height="4" fill="${c}" opacity="${r(0.45 + rand() * 0.5)}"/>`;
          }
        }
      }
    }
    x += w + rand() * 6;
  }
  return out;
}

function palm(x, baseY, h, lean, s, color) {
  const tx = x + lean;
  const ty = baseY - h;
  const base = 10 * s;
  const tip = 4 * s;
  const trunk = `<path d="M${r(x - base)} ${baseY} Q ${r(x + lean * 0.3 - base * 0.8)} ${r(baseY - h * 0.55)} ${r(tx - tip)} ${r(ty)} L ${r(tx + tip)} ${r(ty)} Q ${r(x + lean * 0.3 + base * 0.8)} ${r(baseY - h * 0.55)} ${r(x + base)} ${baseY} Z" fill="${color}"/>`;
  // Two rings of broad, drooping fronds.
  const ring = (angles, len, droop, width) =>
    angles
      .map((a, i) => {
        const L = len * (0.9 + (i % 3) * 0.08) * s;
        const rad = (a * Math.PI) / 180;
        const ex = tx + Math.cos(rad) * L;
        const ey = ty + Math.sin(rad) * L * 0.35 + droop * L;
        const mx = tx + Math.cos(rad) * L * 0.5;
        const my = ty + Math.sin(rad) * L * 0.35 - 0.18 * L;
        const w = width * s;
        return `<path d="M${r(tx)} ${r(ty)} Q ${r(mx)} ${r(my - w)} ${r(ex)} ${r(ey)} Q ${r(mx)} ${r(my + w * 0.6)} ${r(tx)} ${r(ty)} Z" fill="${color}"/>`;
      })
      .join("");
  const fronds =
    ring([-175, -145, -115, -65, -35, -5, 25, 205], 120, 0.55, 16) + ring([-160, -128, -90, -52, -20, 190], 92, 0.3, 13);
  return trunk + fronds + `<ellipse cx="${r(tx)}" cy="${r(ty + 4 * s)}" rx="${r(9 * s)}" ry="${r(7 * s)}" fill="${color}"/>`;
}

function bridge(x0, x1, deckY, color, lights) {
  const span = x1 - x0;
  const p1 = x0 + span * 0.3;
  const p2 = x0 + span * 0.7;
  const top = deckY - 90;
  let cables = "";
  for (const p of [p1, p2]) {
    for (let i = 1; i <= 7; i++) {
      cables += `<line x1="${r(p)}" y1="${r(top + 6)}" x2="${r(p - i * 26)}" y2="${deckY}" stroke="${color}" stroke-width="1" opacity=".7"/>`;
      cables += `<line x1="${r(p)}" y1="${r(top + 6)}" x2="${r(p + i * 26)}" y2="${deckY}" stroke="${color}" stroke-width="1" opacity=".7"/>`;
    }
  }
  let deckLights = "";
  for (let x = x0; x < x1; x += 22) deckLights += `<circle cx="${r(x)}" cy="${deckY - 2}" r="1.4" fill="${lights[0]}" opacity=".9"/>`;
  return `${cables}<rect x="${r(p1 - 4)}" y="${r(top)}" width="8" height="${r(deckY - top + 30)}" fill="${color}"/><rect x="${r(p2 - 4)}" y="${r(top)}" width="8" height="${r(deckY - top + 30)}" fill="${color}"/><rect x="${x0}" y="${deckY}" width="${span}" height="6" fill="${color}"/>${deckLights}`;
}

function tower(cx, baseY, color, light) {
  // Fictional art-deco tower: stepped tiers and a spire.
  return `<g>
    <rect x="${cx - 46}" y="${baseY - 300}" width="92" height="300" fill="${color}"/>
    <rect x="${cx - 36}" y="${baseY - 360}" width="72" height="62" fill="${color}"/>
    <rect x="${cx - 24}" y="${baseY - 408}" width="48" height="50" fill="${color}"/>
    <rect x="${cx - 12}" y="${baseY - 440}" width="24" height="34" fill="${color}"/>
    <polygon points="${cx - 4},${baseY - 440} ${cx + 4},${baseY - 440} ${cx},${baseY - 520}" fill="${color}"/>
    <circle cx="${cx}" cy="${baseY - 522}" r="3" fill="${light}"/>
    <circle cx="${cx}" cy="${baseY - 522}" r="14" fill="${light}" opacity=".25"/>
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${cx - 38}" y="${baseY - 290 + i * 17}" width="76" height="2" fill="${light}" opacity="${i % 3 === 0 ? 0.55 : 0.18}"/>`).join("")}
    <rect x="${cx - 2}" y="${baseY - 400}" width="4" height="380" fill="${light}" opacity=".35"/>
  </g>`;
}

function car(x, y, s, body, light, tail) {
  // Low coupe in profile, facing right.
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="34" rx="110" ry="7" fill="#000" opacity=".45"/>
    <path d="M-100 18 Q -98 4 -80 2 L -44 -2 Q -22 -24 12 -24 Q 40 -24 58 -6 L 92 0 Q 106 4 104 18 L 104 24 L -100 24 Z" fill="${body}"/>
    <path d="M-34 -3 Q -16 -19 10 -19 Q 34 -19 48 -5 Z" fill="#0b1018" opacity=".85"/>
    <path d="M-30 -4 Q -14 -16 8 -16 L 8 -4 Z" fill="${light}" opacity=".18"/>
    <path d="M-96 10 L 100 10" stroke="${light}" stroke-opacity=".35" stroke-width="1.2"/>
    <circle cx="-62" cy="24" r="13" fill="#05080f"/><circle cx="-62" cy="24" r="6" fill="#273443"/>
    <circle cx="66" cy="24" r="13" fill="#05080f"/><circle cx="66" cy="24" r="6" fill="#273443"/>
    <rect x="96" y="6" width="9" height="4" rx="1.5" fill="${light}"/>
    <ellipse cx="150" cy="10" rx="60" ry="10" fill="${light}" opacity=".18"/>
    <rect x="-101" y="6" width="6" height="4" rx="1.5" fill="${tail}"/>
    <ellipse cx="-104" cy="8" rx="14" ry="6" fill="${tail}" opacity=".35"/>
  </g>`;
}

function flamingo(x, y, s, color) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="26" ry="15" fill="${color}"/>
    <path d="M18 -6 Q 34 -40 22 -62 Q 14 -78 24 -86" stroke="${color}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <circle cx="27" cy="-88" r="6.5" fill="${color}"/>
    <path d="M31 -88 Q 40 -86 38 -78" stroke="#1d1b2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M-4 12 L -4 64 M 4 12 L 10 40 L 2 62" stroke="${color}" stroke-width="2.4" fill="none"/>
    <path d="M-26 -2 Q -40 4 -36 12" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
}

function reflections(rand, x0, x1, y0, y1, colors, count) {
  // Broken horizontal shimmer, denser and brighter near the shore.
  let out = "";
  for (let i = 0; i < count * 3; i++) {
    const x = x0 + rand() * (x1 - x0);
    const t = Math.pow(rand(), 1.8);
    const y = y0 + 4 + t * (y1 - y0);
    const w = 4 + rand() * 18 * (1 - t * 0.5);
    out += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(1.2 + rand() * 1.4)}" fill="${colors[Math.floor(rand() * colors.length)]}" opacity="${r((0.12 + rand() * 0.35) * (1 - t * 0.7))}"/>`;
  }
  return out;
}

function sunStreaks(cx, y0, color, count) {
  const rand = rng(Math.round(cx));
  let out = "";
  for (let i = 0; i < count; i++) {
    const spread = 18 + i * 14;
    const y = y0 + 6 + i * i * 1.6;
    for (let k = 0; k < 3; k++) {
      const w = spread * (0.3 + rand() * 0.5);
      const x = cx - spread / 2 + rand() * (spread - w);
      out += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(1.6 + i * 0.12)}" fill="${color}" opacity="${r(0.65 - i * 0.035)}"/>`;
    }
  }
  return out;
}

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" role="img">${body}</svg>\n`;
}

/* ---------------------------------------------------------------------------
 * Scenes
 * ------------------------------------------------------------------------- */

function heroCoast() {
  const W = 1920, H = 1080, id = "hc", p = palettes.sunset, rand = rng(7);
  const horizon = 640;
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
  <circle cx="1380" cy="${horizon - 40}" r="230" fill="url(#${id}-sun)"/>
  <circle cx="1380" cy="${horizon - 40}" r="64" fill="${p.sun}" opacity=".95"/>
  ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${r(300 + i * 260 + rand() * 80)}" cy="${r(220 + rand() * 180)}" rx="${r(140 + rand() * 160)}" ry="${r(8 + rand() * 10)}" fill="#f2a65e" opacity="${r(0.08 + rand() * 0.12)}"/>`).join("")}
  ${skyline(rand, { x0: 0, x1: W, baseY: horizon, minH: 40, maxH: 170, color: p.far })}
  <rect y="${horizon - 120}" width="${W}" height="160" fill="url(#${id}-haze)"/>
  ${skyline(rand, { x0: 520, x1: 1240, baseY: horizon, minH: 90, maxH: 330, color: p.mid, windows: true, lights: p.lights })}
  ${tower(1040, horizon, p.mid, p.lights[0])}
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#${id}-water)"/>
  ${sunStreaks(1380, horizon, p.sun, 14)}
  ${reflections(rand, 520, 1240, horizon, H - 160, p.lights, 60)}
  ${bridge(-40, 640, horizon + 40, "#141826", p.lights)}
  <path d="M0 ${H - 150} Q 700 ${H - 200} ${W} ${H - 170} L ${W} ${H} L 0 ${H} Z" fill="${p.near}"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${200 + i * 190}" y="${H - 214 + (i % 2) * 6}" width="3" height="40" fill="#0b1018"/><circle cx="${201 + i * 190}" cy="${H - 216 + (i % 2) * 6}" r="3" fill="${p.lights[0]}"/><circle cx="${201 + i * 190}" cy="${H - 216 + (i % 2) * 6}" r="16" fill="${p.lights[0]}" opacity=".15"/>`).join("")}
  ${palm(150, H - 120, 470, 60, 1.25, p.near)}
  ${palm(320, H - 130, 380, -30, 1.0, p.near)}
  ${palm(1750, H - 120, 500, -70, 1.3, p.near)}
  ${palm(1600, H - 140, 360, 20, 0.95, p.near)}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

/** Waterfront boulevard at dusk. Subjects at fixed positions (see fixtures). */
function boulevard() {
  const W = 1600, H = 1000, id = "bv", p = palettes.dusk, rand = rng(21);
  const horizon = 560;
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
  <circle cx="420" cy="${horizon - 30}" r="200" fill="url(#${id}-sun)"/>
  ${skyline(rand, { x0: 0, x1: W, baseY: horizon, minH: 50, maxH: 160, color: p.far })}
  <rect y="${horizon - 110}" width="${W}" height="150" fill="url(#${id}-haze)"/>
  ${skyline(rand, { x0: 760, x1: 1600, baseY: horizon, minH: 80, maxH: 300, color: p.mid, windows: true, lights: p.lights })}
  ${tower(1180, horizon, p.mid, p.lights[0])}
  <rect y="${horizon}" width="${W}" height="140" fill="url(#${id}-water)"/>
  ${reflections(rand, 760, 1600, horizon, horizon + 130, p.lights, 50)}
  <rect y="${horizon + 130}" width="${W}" height="16" fill="#1c2232"/>
  <rect y="${horizon + 146}" width="${W}" height="${H - horizon - 146}" fill="#10151f"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 150 + 40}" y="${horizon + 236}" width="70" height="4" fill="#55d6d0" opacity=".25"/>`).join("")}
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${120 + i * 280}" y="${horizon + 70}" width="3" height="76" fill="#0a0f17"/><circle cx="${121 + i * 280}" cy="${horizon + 68}" r="3.5" fill="${p.lights[0]}"/><circle cx="${121 + i * 280}" cy="${horizon + 68}" r="22" fill="${p.lights[0]}" opacity=".14"/>`).join("")}
  ${flamingo(250, horizon + 92, 0.95, "#e58fa0")}
  ${car(560, horizon + 228, 1.25, "#1e2a3a", "#ffe6c2", "#f2665a")}
  ${palm(60, H, 520, 40, 1.15, p.near)}
  ${palm(1530, H, 560, -60, 1.25, p.near)}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

function neonStreet() {
  const W = 1600, H = 1000, id = "ns", p = palettes.night, rand = rng(33);
  const horizon = 600;
  let facades = "";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const depth = i / 6;
      const x = side < 0 ? 40 + i * 70 : W - 40 - i * 70 - 120;
      const top = 120 + depth * 260;
      facades += `<rect x="${x}" y="${top}" width="${140 - i * 10}" height="${H - top}" fill="${i % 2 ? "#0c1220" : "#101828"}"/>`;
      if (i % 2 === 0) {
        const c = i % 4 === 0 ? "#55d6d0" : "#f29b52";
        facades += `<rect x="${x + 18}" y="${top + 60}" width="${80 - i * 8}" height="14" rx="3" fill="${c}" opacity=".85"/><rect x="${x + 6}" y="${top + 48}" width="${104 - i * 8}" height="38" fill="${c}" opacity=".12" filter="url(#${id}-soft)"/>`;
      }
      for (let k = 0; k < 10; k++) {
        if (rand() < 0.5) facades += `<rect x="${r(x + 10 + rand() * 100)}" y="${r(top + 100 + rand() * 300)}" width="6" height="8" fill="${p.lights[Math.floor(rand() * 4)]}" opacity="${r(0.3 + rand() * 0.5)}"/>`;
      }
    }
  }
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
  ${skyline(rand, { x0: 500, x1: 1100, baseY: horizon, minH: 120, maxH: 380, color: p.far, windows: true, lights: p.lights, density: 0.8 })}
  ${facades}
  <polygon points="0,${H} ${W},${H} ${W / 2 + 60},${horizon} ${W / 2 - 60},${horizon}" fill="#0a0f19"/>
  ${Array.from({ length: 8 }, (_, i) => `<polygon points="${W / 2 - 3 - i * 1.5},${horizon + 40 + i * i * 7} ${W / 2 + 3 + i * 1.5},${horizon + 40 + i * i * 7} ${W / 2 + 4 + i * 2},${horizon + 58 + i * i * 8} ${W / 2 - 4 - i * 2},${horizon + 58 + i * i * 8}" fill="#f2f4f5" opacity=".35"/>`).join("")}
  ${reflections(rand, 300, 1300, horizon + 120, H, ["#55d6d0", "#f29b52"], 40)}
  ${car(800, H - 150, 1.6, "#1b2433", "#ffe6c2", "#f2665a")}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

function marsh() {
  const W = 1600, H = 1000, id = "ms", p = palettes.dusk, rand = rng(48);
  const horizon = 520;
  let reeds = "";
  for (let i = 0; i < 160; i++) {
    const x = rand() * W;
    const h = 40 + rand() * 120;
    const base = H - rand() * 160;
    reeds += `<path d="M${r(x)} ${r(base)} q ${r(4 + rand() * 10)} ${r(-h / 2)} ${r(rand() * 18 - 4)} ${r(-h)}" stroke="#0a0f17" stroke-width="${r(1.5 + rand() * 2)}" fill="none"/>`;
  }
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
  <circle cx="1100" cy="${horizon - 20}" r="220" fill="url(#${id}-sun)"/>
  <circle cx="1100" cy="${horizon - 20}" r="52" fill="${p.sun}"/>
  ${skyline(rand, { x0: 900, x1: 1500, baseY: horizon, minH: 20, maxH: 80, color: p.far })}
  <path d="M0 ${horizon} Q 400 ${horizon - 30} 800 ${horizon} T 1600 ${horizon - 10} L 1600 ${horizon + 6} L 0 ${horizon + 6} Z" fill="#1a1d2c"/>
  <rect y="${horizon + 4}" width="${W}" height="${H - horizon}" fill="url(#${id}-water)"/>
  ${sunStreaks(1100, horizon, p.sun, 12)}
  ${palm(1380, horizon + 10, 220, -20, 0.6, "#151827")}${palm(1450, horizon + 12, 180, 15, 0.5, "#151827")}
  ${flamingo(520, horizon + 220, 2.1, "#e58fa0")}
  ${flamingo(760, horizon + 250, 1.6, "#d97f92")}
  ${reeds}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

function pier() {
  const W = 1600, H = 1000, id = "pr", p = palettes.sunset, rand = rng(64);
  const horizon = 560;
  let posts = "";
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const x = 300 + t * 900;
    const y = horizon + 20 + (1 - t) * 40;
    posts += `<rect x="${r(x)}" y="${r(y)}" width="${r(6 - t * 3)}" height="${r(80 - t * 50)}" fill="#0b1018"/>`;
  }
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
  <circle cx="800" cy="${horizon - 10}" r="260" fill="url(#${id}-sun)"/>
  <circle cx="800" cy="${horizon - 10}" r="70" fill="${p.sun}"/>
  ${skyline(rand, { x0: 1150, x1: 1600, baseY: horizon, minH: 40, maxH: 200, color: p.far, windows: true, lights: p.lights, density: 0.6 })}
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#${id}-water)"/>
  ${sunStreaks(800, horizon, p.sun, 16)}
  <polygon points="200,${horizon + 70} 1200,${horizon + 18} 1200,${horizon + 24} 200,${horizon + 84}" fill="#0b1018"/>
  ${posts}
  <circle cx="1170" cy="${horizon - 70}" r="80" fill="none" stroke="#0b1018" stroke-width="6"/>
  ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="1170" y1="${horizon - 70}" x2="${r(1170 + Math.cos(a) * 80)}" y2="${r(horizon - 70 + Math.sin(a) * 80)}" stroke="#0b1018" stroke-width="2"/><circle cx="${r(1170 + Math.cos(a) * 80)}" cy="${r(horizon - 70 + Math.sin(a) * 80)}" r="3" fill="${p.lights[0]}"/>`; }).join("")}
  <polygon points="1150,${horizon + 20} 1170,${horizon - 70} 1190,${horizon + 20}" fill="none" stroke="#0b1018" stroke-width="5"/>
  ${palm(110, H, 480, 50, 1.1, p.near)}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

function skylineNight() {
  const W = 1920, H = 1080, id = "sn", p = palettes.night, rand = rng(90);
  const horizon = 700;
  let stars = "";
  for (let i = 0; i < 120; i++) stars += `<circle cx="${r(rand() * W)}" cy="${r(rand() * 420)}" r="${r(0.6 + rand() * 1.1)}" fill="#f2f4f5" opacity="${r(0.2 + rand() * 0.5)}"/>`;
  return svg(W, H, `${defs(p, id)}
  <rect width="${W}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
  ${stars}
  <circle cx="1500" cy="200" r="38" fill="#e8ecf0" opacity=".9"/><circle cx="1500" cy="200" r="120" fill="url(#${id}-glow)" opacity=".12"/>
  ${skyline(rand, { x0: 0, x1: W, baseY: horizon, minH: 80, maxH: 260, color: p.far, windows: true, lights: p.lights, density: 0.7 })}
  <rect y="${horizon - 140}" width="${W}" height="200" fill="url(#${id}-haze)" opacity=".5"/>
  ${skyline(rand, { x0: 300, x1: 1600, baseY: horizon, minH: 140, maxH: 420, color: p.mid, windows: true, lights: p.lights })}
  ${tower(960, horizon, p.mid, "#55d6d0")}
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#${id}-water)"/>
  ${reflections(rand, 300, 1600, horizon, H - 60, p.lights, 80)}
  ${bridge(1300, 2000, horizon + 50, "#0d1322", p.lights)}
  ${palm(120, H, 520, 50, 1.2, p.near)}${palm(1820, H, 480, -40, 1.1, p.near)}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)"/>`);
}

mkdirSync(OUT, { recursive: true });
const scenes = {
  "hero-coast-sunset.svg": heroCoast(),
  "boulevard-dusk.svg": boulevard(),
  "neon-street-night.svg": neonStreet(),
  "marsh-dusk.svg": marsh(),
  "pier-sunset.svg": pier(),
  "skyline-night.svg": skylineNight(),
};
for (const [name, content] of Object.entries(scenes)) {
  writeFileSync(join(OUT, name), content);
  console.log(`${name.padEnd(26)} ${(content.length / 1024).toFixed(1)} KB`);
}
