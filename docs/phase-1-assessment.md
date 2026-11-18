# Phase 1 — Repository Assessment

**Date:** 2026-11-17
**Status:** Scaffold done. Backend contract still needed (blocks Phase 5).

> Written while the product's working name was **SceneID**. It has since been rebranded to **Sixth Sense** (see `docs/brand-guidelines.md`); historical references below are kept as written.

## 1. What existed

- `sceneid/` contained only the frontend plan (then `SCENEID_FRONTEND_PLAN.md`, now `SIXTH_SENSE_FRONTEND_PLAN.md`). No source code, `package.json`, components, assets or logo.
- No backend, OpenAPI/Swagger schema or API docs were found on this machine.
- Result: this is a **greenfield** build. There is no working functionality to preserve.

## 2. What was set up

| Area | Choice |
|---|---|
| Framework | Next.js **16.4.6** (App Router, `src/` dir, Turbopack) |
| React | 19.3 |
| Language | TypeScript 5.9, `strict: true`, alias `@/*` → `src/*` |
| Styling | Tailwind CSS **v4** (CSS-first config in `globals.css`, no `tailwind.config.js`) |
| Lint | ESLint 9 + `eslint-config-next` (core-web-vitals + typescript) |
| Package manager | pnpm 11 |
| VCS | git initialised on `main` (nothing committed yet) |

Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`.

Other changes:
- Removed create-next-app boilerplate page, SVGs and placeholder metadata.
- Added `.env.example` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`); `.env*` stays git-ignored except the example.
- Created the target folder structure from the plan (§Phase 1) with `.gitkeep` files, plus `components/brand/` for the swappable logo.

Phase 2+ dependencies (Motion, TanStack Query, Zustand, React Hook Form, Zod, Lucide, MapLibre, Solana Wallet Adapter, test tooling) are **not installed yet**. Each will be added in the phase that first needs it.

## 3. Architectural constraints (Next.js 16)

These differ from older Next.js and affect how we build:

- **`cacheComponents: true`** is on (scaffold default). Data access that's dynamic (cookies, headers, uncached fetches) must sit inside `<Suspense>` or be cached with `'use cache'`. Pages get a static shell with streamed dynamic parts.
- **`partialPrefetching: true`** is on.
- **Middleware is now `proxy.ts`** (`src/proxy.ts`). Use it only for light checks such as auth redirects, not for session management.
- **Typed route props:** layouts and pages use the global `LayoutProps<'/route'>` / `PageProps<'/route'>` helpers. `params` is async.
- **Tailwind v4:** design tokens go in `@theme` in CSS, not a JS config file.
- `AGENTS.md` (written by Next.js) says to check `node_modules/next/dist/docs/` before using an API, because this version has breaking changes.

## 4. Backend contract: missing

Nothing below could be checked because there's no backend or API spec yet:

| Needed | Status | Frontend features that depend on it |
|---|---|---|
| Base URL / environments | ❌ Unknown | Everything that talks to the API |
| Auth model (session, JWT, wallet signature?) | ❌ Unknown | Login, profile, community actions, admin |
| Screenshot upload endpoint + limits (size, types) | ❌ Unknown | Analyze upload, validation rules |
| Analysis job states + polling vs. push | ❌ Unknown | Analyze progress UI (`idle → … → completed/failed`) |
| Detection shape (bounding boxes? confidence scale?) | ❌ Unknown | Overlays, confidence labels |
| Location model + coordinate system + precision levels | ❌ Unknown | World Explorer, location panel |
| Map data source / permitted map asset | ❌ Unknown | World Explorer base layer |
| Discoveries list/detail, filters, pagination style | ❌ Unknown | Discovery feed and detail |
| Verification / dispute / comment endpoints | ❌ Unknown | Community |
| Profiles, reputation, leaderboard | ❌ Unknown | Profiles, leaderboard |
| Rewards + attestation (Solana network, program) | ❌ Unknown | Rewards, Web3, Proof of Discovery |
| Error response format | ❌ Unknown | Shared error states, API client |
| Admin endpoints | ❌ Unknown | Admin |

**What this means for the plan:**
- Phases 2–3 (design system, app shell) **can go ahead now**. They don't need the backend.
- Phase 4 UI can be built against **typed interfaces + clearly labelled dev mocks**, kept separate in their own folder and never shown as real data.
- Phase 5 is **blocked** until the backend team supplies an OpenAPI spec (or equivalent) and a reachable dev/staging URL.

## 5. Questions for the team

1. Where is the backend (repo, OpenAPI spec, staging URL)?
2. Is there a licensed or permitted map asset for the world map, or should we ship the labelled fallback?
3. Which auth provider or method is planned?
4. Which Solana network (devnet/mainnet) and which attestation program?
5. ~~Final logo: when will it be ready?~~ Answered: the Sixth Sense starburst (`docs/brand-guidelines.md`).
