# Sixth Sense Frontend: Handover

**Date:** 2026-11-18 · **Repo:** this folder (`sceneid`, branch `main`) · **Backend:** `~/Downloads/sceneid-backend` ([Adefolabi/sceneid](https://github.com/Adefolabi/sceneid)), see its `HANDOVER.md`

Read this first, then [PROGRESS.md](PROGRESS.md) for status and open issues.

## 1. What this is

The Next.js web app for Sixth Sense: upload a GTA VI screenshot, get detections and a likely location, explore Leonida on a map, publish discoveries and verify them with the community, with optional Solana wallet identity and Proof of Discovery. Independent fan project, not affiliated with Rockstar or Take-Two.

## 2. Run it

Needs Node 22.18+ and pnpm 11.

```bash
pnpm install
```

```bash
pnpm map:sync
```

```bash
pnpm dev
```

- **Without a backend:** leave `NEXT_PUBLIC_API_BASE_URL` empty. Dev shows labelled sample data. `NEXT_PUBLIC_DEV_SAMPLE_VIEWER=true` signs you in as a sample user.
- **With the backend:** start it (`cd ~/Downloads/sceneid-backend/backend && .venv/bin/python manage.py runserver`) and set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1` in `.env.local`. Sign-in then needs a Solana wallet extension (e.g. Phantom) in the browser.
- Checks before you commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## 3. Things that will surprise you

- **This is Next.js 16.** Middleware is `src/proxy.ts`, `cacheComponents` is on (dynamic data must sit in `<Suspense>` or use `'use cache'`), route `params` are async. Read `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`). `next dev` rewrites `AGENTS.md`; commit it to keep the tree clean.
- **The browser never calls the backend directly.** Everything goes through `src/app/api/backend/[...path]/route.ts`, which attaches the JWT from the `ss_access` cookie and refreshes via `ss_refresh` (`src/lib/api/backend.server.ts`). Sign-in/out goes through `src/app/api/auth/*`. Don't expose tokens to page scripts.
- **Map coordinates are game units, not lat/lng.** See `src/features/world/coordinates.ts` and `gta-projection.ts`. gtadb tiles are 32,768 px at 1 px per metre; MapLibre zoom offset +2.
- **gtadb rules:** never hot-link gtadb.org; tiles and landmarks are pulled from its GitHub repo at a pinned version (`scripts/sync-gta-map.mjs`) into `public/tiles/gta6` and `src/features/world/data/gtadb-snapshot.json`. Keep the attribution and the "Community layer · gtadb.org · CC BY 4.0 · unofficial" labelling. Treat names and coordinates as unofficial.
- **Sample data must never look real.** Mocks live in `*/data/mock-source.ts`, are switched by `src/lib/api/dev-mocks.ts`, and are off in production builds unless `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true` (never set that publicly).
- **Vocabulary mapping lives in `src/lib/api/mappers.ts`:** backend `medium` ↔ frontend `moderate`, `exact` ↔ `confirmed`, `landmark` → `location`, `collectible` → `object` (lossy), extra job statuses collapsed.

## 4. Where things are

| Path | What |
|---|---|
| `src/app/(marketing)` | Landing page |
| `src/app/(platform)` | Product routes: world, analyze, discoveries, community, leaderboard, profile, rewards, web3, developers, notifications, settings |
| `src/app/api/backend`, `src/app/api/auth` | Backend proxy and wallet sign-in routes |
| `src/app/api/world` | Serves the gtadb snapshot to the World map |
| `src/features/<feature>/data/` | `source.ts` interface + `mock-source.ts` + `api-source.ts` |
| `src/features/authentication` | Wallet sign-in UI, session hooks, server helpers (same-origin check, cookies) |
| `src/components/` | UI primitives, maps, analysis, brand (logo geometry in `brand/geometry.ts`) |
| `docs/backend-endpoints.md` | What the frontend asked the backend for |
| `docs/backend-audit.md` | Backend vs frontend audit, decisions |
| `docs/gta-vi-integration-audit.md` | Map source research and gtadb geometry |

## 5. Deploying (Vercel)

Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL` (public backend URL incl. `/api/v1`), later `SIXTH_SENSE_OPENAPI_URL`. The build needs network access to github.com (map sync). The backend's `ALLOWED_HOSTS` must include its public host; CORS isn't needed. Screenshots over 4.5 MB will fail on Vercel until presigned uploads exist.

## 6. Suggested next steps

1. **Run the full journey against the local backend** and record it in PROGRESS.md: wallet sign-in (new wallet + terms), upload, analysis polling, publish, comment, vote (needs a contributor-role second account), wallet link, attestation. Fix whatever breaks in the adapters.
2. Add API integration tests (plan §6.6) against a seeded backend.
3. Until the backend adds an unlink guard, hide or warn on "Unlink wallet" for wallet-only accounts.
4. Forward the client IP from the proxy (`X-Forwarded-For`) once the backend trusts it.
5. Update the tracker at the top of `SIXTH_SENSE_FRONTEND_PLAN.md` and tick §5.1–5.3 as they are validated.
6. Admin (4.12) when un-paused: start with the report moderation queue (`admin/reports/*` exists on the backend).

## 7. Needs a person, not code

- Approve and import the backend's official-names seed (backend owner).
- Backend changes the frontend is waiting on: username rename + `check-username`, `avatar_id`, profile `areas`/`by_category`/`viewer_is_owner`, unlink guard, throttle fix, leaderboard fix, presigned uploads.
- Rename backend user-facing strings from SceneID to Sixth Sense, and decide the on-chain memo prefix (`sceneid:1:`) before mainnet.
- Legal view on gtadb / Rockstar material before a public launch.
