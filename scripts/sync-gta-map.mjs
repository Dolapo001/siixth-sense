// Syncs the GTA VI community map from gtadb.org (CC BY 4.0) at a pinned commit:
//   1. sparse-clones only maps/tiles/6/<set> and map/data/6 into .cache/gtadb
//   2. re-indexes the tiles into MapLibre {z}/{x}/{y}.jpg (see gta-projection.ts)
//      under public/tiles/gta6 (git-ignored; used by `pnpm dev`)
//   3. writes the landmark snapshot to src/features/world/data/gtadb-snapshot.json
//   4. with --upload, puts the tiles on Vercel Blob (needs BLOB_READ_WRITE_TOKEN);
//      then set NEXT_PUBLIC_MAP_TILES_URL to the printed base URL.
//
// gtadb asks that nobody fetch live data or media from gtadb.org, so everything
// is pulled from its git repository and self-hosted. Bump GTADB_COMMIT to update.
//
// Usage: pnpm map:sync [--upload]
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gtadbTileToMapLibre } from "../src/features/world/gta-projection.ts";

const GTADB_REPO = "https://github.com/rolux/gtadb.org.git";
const GTADB_COMMIT = "8b1dc4f0619d8760fd87881c396225c147f4d738";
const TILE_SET = "yanis,18";

const root = process.cwd();
const cache = join(root, ".cache", "gtadb");
const tilesOut = join(root, "public", "tiles", "gta6");
const snapshotOut = join(root, "src", "features", "world", "data", "gtadb-snapshot.json");
const upload = process.argv.includes("--upload");

const git = (...args) => execFileSync("git", args, { cwd: cache, stdio: "inherit" });

// 1. Sparse checkout at the pinned commit.
if (!existsSync(join(cache, ".git"))) {
  mkdirSync(cache, { recursive: true });
  git("init", "--quiet");
  git("remote", "add", "origin", GTADB_REPO);
  git("config", "core.sparseCheckout", "true");
}
git("sparse-checkout", "set", "--no-cone", `/maps/tiles/6/${TILE_SET}/`, "/map/data/6/", "/LICENSE-DATA");
git("fetch", "--quiet", "--depth=1", "--filter=blob:none", "origin", GTADB_COMMIT);
git("checkout", "--quiet", "--force", GTADB_COMMIT);

// 2. Tiles: gtadb "<z>/<z>,<y>,<x>.jpg" → MapLibre "<z>/<x>/<y>.jpg".
const tileSrc = join(cache, "maps", "tiles", "6", TILE_SET);
const tiles = [];
for (const zDir of readdirSync(tileSrc)) {
  for (const file of readdirSync(join(tileSrc, zDir))) {
    const match = /^(\d+),(\d+),(\d+)\.jpg$/.exec(file);
    if (!match) continue;
    const [, z, y, x] = match.map(Number);
    const t = gtadbTileToMapLibre(z, x, y);
    const rel = join(String(t.z), String(t.x), `${t.y}.jpg`);
    mkdirSync(join(tilesOut, String(t.z), String(t.x)), { recursive: true });
    copyFileSync(join(tileSrc, zDir, file), join(tilesOut, rel));
    tiles.push(rel);
  }
}
console.log(`${tiles.length} tiles → public/tiles/gta6/`);

// 3. Landmark snapshot. gtadb record: [igAddress, igXY, igPhotoSize, rlAddress, rlLatLng, rlPhotoSize, tags, …].
const raw = JSON.parse(readFileSync(join(cache, "map", "data", "6", "landmarks.json"), "utf8"));
// Editor-only tags (layers, colours, bus routes) aren't meaningful to players.
const isEditorTag = (tag) => /^(l\d+|\/\/|#)/.test(tag);
const landmarks = Object.entries(raw).map(([id, record]) => {
  const [igAddress, igXY, , rlAddress, , , tags = []] = record;
  const parts = String(igAddress)
    .split(",")
    .map((part) => part.trim());
  const clean = tags.filter((tag) => !isEditorTag(tag));
  return {
    id,
    // "?" means the in-game name isn't known yet.
    name: parts[0] && parts[0] !== "?" ? parts[0] : null,
    // Broadest last, e.g. ["Washington Beach", "Vice Beach"].
    area: parts.slice(1),
    x: igXY?.[0] ?? null,
    y: igXY?.[1] ?? null,
    tags: clean,
    realWorld: rlAddress || null,
  };
});
writeFileSync(
  snapshotOut,
  JSON.stringify({
    source: {
      name: "gtadb.org",
      url: "https://map.gtadb.org",
      repository: GTADB_REPO.replace(/\.git$/, ""),
      commit: GTADB_COMMIT,
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org",
      tileAttribution: `GTA VI Map Tiles (CC BY 4.0) — https://map.gtadb.org, base art ${TILE_SET.replace(",", " v")} by the GTA VI mapping community`,
      changes: "Editor-only tags removed; addresses split into name and areas.",
    },
    landmarks,
  }),
);
console.log(`${landmarks.length} landmarks → ${snapshotOut.replace(root + "/", "")}`);

// 4. Optional upload to Vercel Blob.
if (upload) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Set BLOB_READ_WRITE_TOKEN to upload tiles.");
  const { put } = await import("@vercel/blob");
  const prefix = `tiles/gta6/${TILE_SET.replace(",", "-")}`;
  let done = 0;
  let base = "";
  for (let i = 0; i < tiles.length; i += 16) {
    await Promise.all(
      tiles.slice(i, i + 16).map(async (rel) => {
        const blob = await put(`${prefix}/${rel}`, readFileSync(join(tilesOut, rel)), {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "image/jpeg",
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        });
        base ||= blob.url.slice(0, blob.url.indexOf(prefix) + prefix.length);
        done += 1;
      }),
    );
    process.stdout.write(`\ruploaded ${done}/${tiles.length}`);
  }
  console.log(`\nSet NEXT_PUBLIC_MAP_TILES_URL=${base}`);
}
