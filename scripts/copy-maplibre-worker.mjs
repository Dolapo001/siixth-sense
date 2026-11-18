// Copies MapLibre's web worker into public/ so the browser can load it.
// MapLibre looks for the worker next to its own bundle, which Next's bundler
// renames, so we serve a copy at a stable, versioned URL instead.
// Runs as part of `pnpm dev` and `pnpm build` (pnpm skips pre* hooks by default).
// Output is git-ignored.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const source = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const targetDir = join(process.cwd(), "public", "vendor");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre-gl worker ${version} → public/vendor/`);
