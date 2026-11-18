# Sixth Sense — GTA VI Integration: Phase 1 Audit

**Date:** 2026-11-18 (GTA VI releases 2026-11-19)
**Scope:** The existing frontend, measured against the "GTA VI integration" brief. No code changed in this phase.

---

## 1. What exists and works (preserve)

| Area | State |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, TanStack Query, Motion, MapLibre GL 6. Lint, typecheck, 273 tests and the production build all pass. |
| Brand | Sixth Sense starburst, wordmark, tagline, tokens, icons, OG/Twitter images, manifest, brand guidelines. Final. |
| Routes | `/`, `/world`, `/world/[locationId]`, `/analyze`, `/discoveries`, `/discoveries/[id]`, `/community`, `/leaderboard`, `/profile`, `/profile/[username]`, `/rewards`, `/web3`, `/web3/proof`, `/developers`, `/notifications`, `/settings`, `/admin`, `/auth/*`. |
| Navigation | Expandable desktop rail, mobile bottom bar with a "More" sheet, landing nav with in-page sections. |
| Data architecture | Each feature reads through a typed **data source interface** (`src/features/*/data/source.ts`). Today each source returns a clearly labelled dev mock, or `null` ("not connected yet") in production. This is the seam where real data plugs in, without touching the UI. |
| World Explorer | MapLibre map in its **own game-world coordinate system** (`features/world/coordinates.ts`; not lat/lng). Clustered, accessible marker overlay; category filters; search (combobox); region fit; location detail panel; list fallback when WebGL fails; deep links `/world/[id]`. |
| Analyze | Upload with validation, progress and cancel; job polling; bounding-box overlay that only draws boxes the service returns; confidence and verification labels; candidate locations; failure and retry states. |
| Discoveries / community | Feed with filters and pagination in the URL; detail page with evidence, suggestions, votes, verification history, comments, reports and follow. Eligibility is decided by the server. |
| Profiles / leaderboard / web3 / rewards | Built against typed interfaces; signature-only wallet linking. |
| Production readiness | Security headers/CSP, per-route code splitting, SEO (robots, sitemap, canonicals, noindex rules), accessibility pass, failure-path tests. |

## 2. What looks generic / isn't GTA-specific

| Where | Problem |
|---|---|
| **World map base layer** | A grey **placeholder grid**. No GTA VI imagery. |
| **World data** (`features/world/data/mock-source.ts`) | Invented sample markers, regions and locations ("Sample data" label). Not Leonida's real geography. |
| **Regions** | Sample regions, not the six destinations (Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, Mount Kalaga National Park). |
| **Categories** | Generic (`location, vehicle, character, wildlife, object, event, hidden`). The brief also wants landmarks, collectibles and activities, from the backend's definitions. |
| **Discoveries / community / profiles / leaderboard mocks** | Generated sample users and records ("Sample User 2"), labelled as samples. |
| **Analysis mock** | Returns sample detections so the flow can be exercised. Labelled as sample, but not GTA-real. |
| **Landing page artwork** | Original illustrated SVG scenes (deliberately not GTA art, per the earlier rule against unlicensed artwork). Landing map preview is an "illustrative map". |
| **Search** | Searches only the sample markers and regions on the map. No entity search (vehicles, characters, wildlife, collectibles, discoveries). |

## 3. Map source research

| Source | What it offers | Licence | Usable? |
|---|---|---|---|
| **gtadb.org** ([repo](https://github.com/rolux/gtadb.org)) | GTA VI raster tiles (several art versions; latest `yanis,18`) and **3,431 GTA VI landmarks** (3,340 placed) with in-game names/addresses, in-game coordinates, types and real-world counterparts. Photos. | Code MIT. **Data, photos and tiles CC BY 4.0.** Attribution: "GTA VI Map Tiles (CC BY 4.0) — https://map.gtadb.org" and "GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org". | **Yes, with conditions:** attribution, and *"Please do not fetch live data or media from gtadb.org – simply git pull."* So data and tiles must be **self-hosted**. |
| api.gtadb.org | Experimental geocode/landmarks/static map/elevation. | No terms, no licence stated. | Not as a production dependency (experimental; owner asks not to fetch live). |
| leonidamap.it, loreside.com, gtamap.io | Fan maps. | No reuse licence found. gtamap.io states it includes leak-derived data. | **No.** Scraping or embedding without a licence is out. |

**gtadb tile geometry** (from its `maps/maps.js`): 256 px JPEG tiles at `tiles/6/{set}/{z}/{z},{y},{x}.jpg`. The full map is 32,768 px square at 1 px per metre, origin pixel 16,384, y axis pointing north. Zoom z has 1024·2^z px. This maps onto MapLibre raster tiles with a zoom offset of +2, and onto our existing game-coordinate system. **No lat/lng is involved.**

**Caveats:**
- The tiles are **community-made** ("base art YANIS v18 by the GTA VI mapping community"), derived from trailers, official frames and some leaks. CC BY covers the community's work; it does not settle Rockstar/Take-Two rights in the underlying game world.
- Coordinates and names are **unofficial until verified against the released game**.
- Landmark `types` mix real categories (`hotel`, `residential`, `natural`, `transportation`…) with internal editor tags (`l4`, `//pink`, `#bus`), which need mapping.

## 4. What data exists vs. what the brief asks for

| Brief requirement | gtadb provides | Gap |
|---|---|---|
| Six destinations, counties, cities, neighbourhoods | Hierarchy **implied by addresses** ("Vice Regal, Washington Beach, Vice Beach"; top-level areas include Vice City, Vice Beach, Port Gellhorn, Ambrosia, Key Lento, Mariana County, Kelly County…) | **No region polygons/boundaries.** "Grassrivers" doesn't appear as an area; "Leonida Keys" would be a grouping of Keys. Boundaries can't be drawn without inventing them. |
| Landmarks, buildings, beaches, islands, natural features | Points with types | Points only, no shapes |
| Roads, rivers, wetlands as layers | Visible in the **tile imagery** only | No vector data |
| Vehicles, characters, wildlife, collectibles | **None** | Needs the Sixth Sense knowledge base (backend) |
| Discoveries, community, verification | **None** | Needs the Sixth Sense backend |
| Screenshot analysis | **None** | Needs the Sixth Sense AI service |
| Entity search | Landmarks only | Everything else needs the backend |

## 5. Backend status

There is **still no Sixth Sense backend, API or OpenAPI document** (see `docs/backend-endpoints.md`). The brief says "use existing backend contracts" and "do not invent endpoints", but none exist. Everything except the map (tiles + landmarks) is therefore blocked on the backend, exactly as before.

## 6. Decisions needed before Phase 2

1. **Use gtadb's community tiles and landmarks?** (CC BY 4.0, attribution required, unofficial and community-derived.)
2. **Where do the tiles live?** The owner asks not to hot-link. A full GTA VI tile set is roughly 30k files, too large for the git repo. Options: a CDN/object storage bucket (e.g. Vercel Blob) synced from the gtadb repo, or a later backend tile service.
3. **How does geography reach the frontend without a backend?** Proposed: a **pinned, versioned snapshot** of gtadb's `landmarks.json`, transformed at build time and served by Next.js server code behind the existing `WorldDataSource` interface, as an interim stand-in the backend replaces later. Alternative: wait for the backend.

## 7. Preserve list

Routing, navigation, brand, data-source seams, accessibility work, CSP and security headers, tests, SEO rules, dev-mock labelling, the honesty rules (no fabricated detections, confidence or engagement), and the existing game-coordinate map engine (it is already lat/lng-free, which suits GTA coordinates).

---

## 8. Progress (2026-11-18)

Decisions: gtadb as the map foundation; tiles self-hosted, generated at build time and served as static files (Vercel Blob was dropped: the Hobby plan's 2,000 uploads/month can't hold 5,506 tiles, and exceeding it locks Blob for 30 days); geography from a pinned snapshot served by this app until the backend exists.

**Phase 2 — GTA map: done.**
- `scripts/sync-gta-map.mjs` (`pnpm map:sync`) sparse-clones gtadb at a pinned commit, re-indexes the `yanis,18` tiles to MapLibre `{z}/{x}/{y}` and writes the landmark snapshot.
- Only Leonida is synced and shown (5,506 tiles, 35 MB). The tile art's legend panel, which carries credits and trailer-frame thumbnails, is excluded from the sync and masked on the map.
- `gta-projection.ts` is the single projection, used by both the map and the sync script. Game metres sit on a small Web Mercator patch at (0, 0); gtadb zoom z is MapLibre zoom z + 12. Alignment was verified by plotting all 3,340 placed landmarks over the stitched tiles.
- Licence attribution is shown in the map's attribution control. An "Unofficial community map · gtadb.org · CC BY 4.0" badge is on the map.

**Phase 3 — geography: done (interim).**
- `GET /api/world/overview` (static) and `GET /api/world/locations/[id]` serve the snapshot behind the existing `WorldDataSource` (`kind: "snapshot"`).
- 37 areas are derived from the landmarks' own addresses and positions. The official destinations present in the data come first (Vice City, Port Gellhorn, Ambrosia). Grassrivers, Leonida Keys and Mount Kalaga don't appear as named areas in the data, so they're not invented.
- Location panels show areas, kind tags, the real-world counterpart, and source/licence with an "unofficial" note. Records are never marked verified or "confirmed" precision, and no discoveries or activity are fabricated.

**Production note:** `public/tiles` is git-ignored and generated by `pnpm build` (git sparse fetch from GitHub, ~20 s), so Vercel serves it from its CDN. The build needs network access to github.com.

**Phase 4 — layers and search: done (for map data).**
- Eight layers from landmark kinds (`features/world/layers.ts`): Landmarks, Hotels & leisure, Transport, Nature (on by default, about 600 places), and Shops & offices, Residential, Industry & utilities, Unclassified (off by default). Each one can be toggled, with counts.
- Discoveries, collectibles, vehicle sightings and wildlife sightings are listed in the legend as arriving with Sixth Sense data. They are never drawn from invented records.
- Search covers every place and area regardless of the active layers. It matches names and the areas a place sits in, ranks names that start with the query first, and shows the kind and area chain. Picking a place on a hidden layer switches that layer on and opens it; picking an area frames it.
- The area menu lists the official destinations first, then all 37 areas from the data.

**Map follow-ups: done.** Map-native markers (clustered GeoJSON, layer icons and name labels drawn by MapLibre), the Browse drill-down (area → neighbourhood → place), descriptive names for every place, collapsible layers with All/None, and a mobile legend sheet.

**Phase 5 — entities and discoveries: done (for what exists).** Discovery categories now include Landmarks, Collectibles and Activities. Discovery pages show the real map location and a Sources card (contributor, AI vs community, gtadb attribution, "no official source"). Dev samples sit at real places. The landing map is the real Leonida preview with 14 real landmarks.

**Phase 6 — Analyze: done.** Candidate locations on the real map, an honest uncertainty explanation, "Ask the community" (typed `POST /discoveries`), and a "How to read these results" guide.

**Profiles: done.** "Areas explored" pinned on the Leonida map, and discoveries by category (new `areas` / `byCategory` profile fields).

**Auth: done (backend).** Wallet sign-in only, through the backend: `auth/wallet/challenge/` → wallet signs → `auth/wallet/login/` (a new wallet must accept the terms). The backend's JWTs live in HTTP-only cookies set by this app; `/api/backend/*` attaches and refreshes them, with CSRF origin checks. The interim in-app session (and `AUTH_SECRET`) is gone.

**Phase 7 — visual: done.** Shared glass for floating map UI (`glass-control`) and panels and dialogs (`glass-sheet`), card hover lift, and selective cyan.

**Phase 8 — production: done.** World pages are indexable and the sitemap lists every place. Route bundles were checked (Settings went from 171 KB to 41 KB). Node engine pinned; deploy variables are in the README.

**Backend connected (2026-11-18).** The backend (github.com/Adefolabi/sceneid, `backend/`) now exists and every data source has a live implementation (`src/features/*/data/api-source.ts`), used whenever `NEXT_PUBLIC_API_BASE_URL` is set. Decision: gtadb stays the map foundation even though the backend's own docs declined to import it.
- Geography is still the gtadb snapshot; the backend's discoveries are drawn on top as a "Discoveries" layer.
- The backend has no gtadb places yet, so a discovery shared at a map place carries a `place:<gtadb id>` tag, and the map reads it back from the 100 most recent discoveries. The proper fix is importing the gtadb landmarks into the backend as locations (with their gtadb ids), after which discoveries get real location links and `world/markers/` returns them.
- Analysis needs `ANTHROPIC_API_KEY` on the backend; without it every job fails with that message.
- Usernames are assigned by the backend (`sol_…`) and can't be renamed yet; preset avatars travel in `avatar_url`.

**Decision (2026-11-18):** the backend audit (`docs/backend-audit.md`) found that the backend refuses gtadb data as possibly leak-derived. The owner chose to keep gtadb on the frontend as a **clearly labelled community layer**, separate from the backend's verified data. Labels and source notes now say so, including gtadb's own caveat about leaked material.
