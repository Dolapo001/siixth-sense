# Sixth Sense Frontend: Progress

**Last updated:** 2026-11-18 · **Branch:** `main` @ `1c4382b` · **Companions:** [HANDOVER.md](HANDOVER.md) (how to pick this up) · [ROADMAP.md](ROADMAP.md) (phased checklist of what's left)

Update this file at the end of every work session. The detailed phase checklist is in [SIXTH_SENSE_FRONTEND_PLAN.md](SIXTH_SENSE_FRONTEND_PLAN.md); its top-level tracker still says Phase 5 is blocked, but that is out of date (see below).

## Health check (2026-11-18)

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ passes |
| `pnpm lint` | ✅ passes |
| `pnpm test` | ✅ 41 files, 383 tests passing |
| Backend tests (`sceneid-backend`) | ✅ 280 passing |
| `node scripts/e2e-journey.mjs --verify` (live backend) | ✅ 46 checks passing |

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1 Reconnaissance | ✅ Done | Backend found (`sceneid-backend`) and audited: [docs/backend-audit.md](docs/backend-audit.md) |
| 2 Design foundation | ✅ Done | Tokens, primitives, motion, brand ([docs/brand-guidelines.md](docs/brand-guidelines.md)) |
| 3 App shell | ✅ Done | Rail, mobile nav, shared states, all routes |
| 4 Core experiences | 🟡 4.1–4.11, 4.13 done | 4.12 Admin **paused by request** (first feature will be the report moderation queue) |
| 5 Backend integration | 🟡 Adapters built, not validated end to end | See next section |
| 6 Production readiness | 🟡 Mostly done | Remaining: real-browser viewport checks, API integration tests against a live backend |

## Backend integration (Phase 5)

Every feature reads through a typed data-source interface (`src/features/*/data/source.ts`) with three implementations: `mock-source.ts` (labelled sample data, dev only), `api-source.ts` (the real backend) and, for the World map, `snapshot-source.ts` (gtadb). Setting `NEXT_PUBLIC_API_BASE_URL` switches everything to the backend.

| Area | State |
|---|---|
| API client, envelope + error handling (`src/lib/api/client.ts`, `mappers.ts`) | ✅ Built |
| Proxy `/api/backend/*` adds the JWT from HTTP-only cookies, refreshes it, refuses token-issuing `auth/*` routes, same-origin check on writes | ✅ Built |
| Wallet sign-in through the backend (`/api/auth/challenge`, `verify`, `session`, `logout`), terms acceptance for new wallets | ✅ Built. Wallet only, no email/password UI (decision 2026-11-18) |
| Discoveries: list, detail, comments, votes, suggestions, evidence, report, follow, submit | ✅ Adapter built |
| Analysis: constraints, upload, job polling | ✅ Adapter built. **Never run against a live analysis** |
| Profiles + leaderboard | 🟡 Adapter built. Username rename is refused (backend has none); avatar stored as a URL to a preset |
| Web3: config, wallet link/unlink, transactions, attestations, rewards | ✅ Adapter built. Unlink has a backend lockout risk (see open issues) |
| World map | 🟡 Geography comes from the pinned gtadb snapshot; backend discoveries are overlaid as a "Discoveries" layer and linked to gtadb places with a `place:<id>` tag |
| Developer portal | 🟡 Renders from `SIXTH_SENSE_OPENAPI_URL`; the backend's schema is too thin to be useful yet |
| Notifications | ✅ Built 2026-11-18 (`src/features/notifications`): list, unread filter, mark read / all read, links to each notification's page, mute by group, unread badge on the rail and mobile top bar. Verified in the browser against the live backend |
| Settings | ✅ Built 2026-11-18 (`src/features/settings`): privacy, add/verify email (new `/verify-email` page), account deletion. Verified in the browser against the live backend |
| End-to-end validation (plan §5.3) | ❌ Not done: no recorded run of sign-in → upload → analysis → publish → verify against a running backend |

## First live backend run (2026-11-18)

[`scripts/e2e-journey.mjs`](scripts/e2e-journey.mjs) drives the real Next.js routes against a running backend with a cookie jar, signing wallet challenges with a throwaway ed25519 keypair (no browser extension needed). **31 checks passing**: sign-in, every adapter read, wallet state, upload → analysis → publish → detail, and sign-out. Still to run live: comment, vote, attestation, rewards, token refresh (see [ROADMAP.md](ROADMAP.md) Phase A).

What the run found, and what was fixed the same day (backend changes are in `sceneid-backend`, see its PROGRESS.md):

1. **Analysis never succeeded** — the backend forced `tool_choice`, which the current models reject. Fixed; one real Claude call verified. A blank `ANTHROPIC_MODEL` env var also overrode the default; fixed.
2. **Every account could lock itself out** — sign-in links the wallet, `/web3` offered "Unlink wallet" to everyone, and the backend allowed it (204). Fixed on both sides: the session carries a `walletOnly` flag and the UI hides the action; the backend now returns 409.
3. **One auth throttle bucket for the whole site** — and token refresh shares that scope, so a throttled refresh would sign players out at random. Fixed: the backend reads `NUM_PROXIES` (default 0, safe) and the frontend forwards the client address on sign-in, refresh and every proxied call. **Production needs `NUM_PROXIES=1` on the backend.**
4. **Publishing with no note failed** — the frontend sends `description: ""` and the backend rejected it. Fixed on the backend.
5. **Confirm always failed** — the backend requires a reason on every vote and the Confirm button sent none. Fixed on the frontend: both votes ask for a reason, and votes are shown as final (they can't be changed).
6. **A screenshot whose analysis once failed could never be analysed again** — re-uploads reused the failed job. Fixed in the analysis adapter: a failed or cancelled analysis is replaced by a fresh one; a completed one is reused.
7. **"SceneID" is user-visible in the wallet signing prompt** (`SceneID wallet verification`), on the one screen every player passes through. Still open (Phase E).

The harness itself got one thing wrong along the way worth remembering: POSTing to `/api/backend/…/` *with* a trailing slash earns a 308 from Next.js, which drops the body. `apiUrl()` already strips it; the harness now does too.

Also confirmed: `notifications/`, `notifications/unread-count/` and `me/settings/` are all live and returning 200 on the backend — the gap there is purely frontend.

## Recent work (newest first)

- `9495499` Profile editing: avatar presets, live username validation, "Their Leonida" area mosaic, category breakdown, SEO index rules.
- `3e7890a` / `340ec4b` / `795bb3d` / `0fd477e` Wallet sign-in via the backend, `AccountPanel`, session management, auth pages.
- `953c244` / `36d92d3` / `73e2531` / `bc55f69` GTA VI map: gtadb tiles and landmarks, layers, static map, location details.
- gtadb labelled as a community layer ("Community layer · gtadb.org · CC BY 4.0 · unofficial") per the 2026-11-18 decision.

## Open issues (ranked)

1. **Rewards never grant anything**: no reward rules are seeded (they wait on the payout decision). Everything else in the journey, including the verification chain and a devnet Proof of Discovery, now runs live (`node scripts/e2e-journey.mjs --verify`, 46 checks).
2. **Backend catalogue is empty** (0 regions, 0 locations, 0 entities locally): search, regions and analysis grounding return nothing until the official-names seed is approved and imported (backend task).
3. **Production must set `NUM_PROXIES=1` on the backend**, or the per-client throttle fix does nothing (the header is safely ignored and the bucket is shared again).
4. **Uploads over 4.5 MB fail on Vercel** (function body limit) while the backend allows 10 MB. Fix: presigned uploads (not built on the backend).
5. **Leaderboard reputation likely inflated** by a `Sum` over multiple joins (backend).
6. **Username rename** and `check-username` don't exist on the backend.
7. **"SceneID" in the wallet signing prompt** and other user-facing backend strings.
8. **`SIXTH_SENSE_FRONTEND_PLAN.md` tracker is stale** (says Phase 5 blocked).

Resolved 2026-11-18 (see the live run above): analysis failing on forced `tool_choice`, blank `ANTHROPIC_MODEL`, wallet unlink lock-out, the shared auth throttle, and publishing with an empty note.

## Decisions on record

| Date | Decision |
|---|---|
| 2026-11-17 | Rebrand SceneID → Sixth Sense; starburst logo final |
| 2026-11-18 | gtadb.org (CC BY 4.0) is the map base, self-hosted, labelled as an unofficial community layer, kept separate from backend verified data (the backend declines it over leak provenance) |
| 2026-11-18 | Map tiles synced from GitHub at build time (`pnpm map:sync`) and served statically; Vercel Blob dropped (upload quota) |
| 2026-11-18 | Sign-in is Solana wallet only, through the backend; JWTs stay in `ss_access` / `ss_refresh` HTTP-only cookies |
| 2026-11-18 | Every vote needs a reason, Confirm as well as Dispute (keeps the backend's rule; confirmations verify discoveries and award reputation, so they need an audit trail). Votes are final |
| — | Admin (4.12) paused by request |
