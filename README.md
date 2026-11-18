# Sixth Sense

**SEE BEYOND THE SCENE.**

Sixth Sense is a visual intelligence and discovery platform for the world of GTA VI. Upload a gameplay screenshot and Sixth Sense identifies what's in it (vehicles, landmarks, wildlife, hidden details), suggests where it was taken, and connects it to an interactive world map and a community that verifies discoveries.

It is not a game, a GTA clone, a chatbot or a trading platform.

This repository is the web frontend.

## Getting started

Requires Node 22.18+ and pnpm 11.

```bash
pnpm install
```

```bash
pnpm dev
```

Open <http://localhost:3000>. Without a backend, development shows clearly labelled sample data. You browse signed out by default; set `NEXT_PUBLIC_DEV_SAMPLE_VIEWER=true` in `.env.local` to sign in as a sample user and try community actions.

To use the real backend ([sceneid backend](https://github.com/Adefolabi/sceneid/tree/main/backend)), run it locally and set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1` in `.env.local`. Players then sign in with their Solana wallet through the backend; its tokens stay in HTTP-only cookies and every API call goes through `/api/backend/*`.

Copy `.env.example` to `.env.local` to configure the API base URL, site URL and OpenAPI document.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Route type generation + `tsc` |
| `pnpm test` | Vitest |
| `pnpm brand:assets` | Regenerates `public/brand/*.svg` and the favicon from the logo geometry |
| `pnpm map:sync` | Pulls the pinned GTA VI community map (gtadb.org, CC BY 4.0): tiles to `public/tiles/gta6` and the landmark snapshot. `pnpm build` runs it; run it once before `pnpm dev` to see the map. |

## Deploying (Vercel)

The default build (`pnpm build`) syncs the GTA map tiles from GitHub, so the build needs network access to github.com (Vercel builds have it). Node 22.18 or newer is required.

| Variable | Needed | What it's for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URLs, social images, sitemap. On Vercel it falls back to the deployment domain. |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | The Sixth Sense backend, including `/api/v1`. Live data and wallet sign-in go through it (via this app's `/api/backend` proxy). Also makes discoveries, community and leaderboard indexable. |
| `SIXTH_SENSE_OPENAPI_URL` | Later | Backend OpenAPI document for the Developer Portal. |
| `NEXT_PUBLIC_MAP_TILES_URL` | No | Serve map tiles from a CDN instead of the build output. |
| `NEXT_PUBLIC_ENABLE_DEV_MOCKS` | Never in production | Labelled sample data for development and previews. |

Screenshot uploads pass through the `/api/backend` proxy. Vercel Functions accept request bodies up to 4.5 MB, below the backend's 10 MB limit, so larger screenshots fail on Vercel until uploads go straight to storage (the backend's presigned uploads aren't built yet). The backend's own `ALLOWED_HOSTS` must include its public host; CORS isn't needed, since only this app's server calls it.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Motion · TanStack Query · React Hook Form + Zod · MapLibre GL · Solana wallet adapter · Vitest.

> This is Next.js 16: middleware is `proxy.ts`, `cacheComponents` is on, and route params are async. See `AGENTS.md`.

## Project layout

```text
src/
  app/            Routes: (marketing) landing, (platform) product, auth/, admin/
  components/     UI primitives, layout, navigation, maps, analysis, brand/
  features/       Feature logic and data sources (world, image-analysis, discoveries, …)
  lib/            API helpers, dev-mock switch, motion presets
public/brand/     Logo files (generated; see docs/brand-guidelines.md)
docs/             Assessment, backend contract, brand guidelines, landing assets
```

## Brand

The logo, colours, type and motion rules are in [`docs/brand-guidelines.md`](docs/brand-guidelines.md). All logo artwork comes from one file, `src/components/brand/geometry.ts`. Use the components in `src/components/brand/` instead of copying SVG.

## Documentation

- [`SIXTH_SENSE_FRONTEND_PLAN.md`](SIXTH_SENSE_FRONTEND_PLAN.md): phased plan and progress
- [`docs/backend-endpoints.md`](docs/backend-endpoints.md): API the frontend asked the backend for (the backend's answer is its `docs/frontend-requirements-response.md`)
- [`docs/phase-1-assessment.md`](docs/phase-1-assessment.md): repository assessment and open questions
- [`docs/brand-guidelines.md`](docs/brand-guidelines.md): brand identity
- [`docs/landing-assets.md`](docs/landing-assets.md): landing artwork rules

## Disclaimer

Sixth Sense is an independent fan-oriented technology project. It is not affiliated with, endorsed by, sponsored by or officially connected to Rockstar Games or Take-Two Interactive.
# siixth-sense
