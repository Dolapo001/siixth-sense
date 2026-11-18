# Sixth Sense Frontend: Progress

**Last updated:** 2026-11-18 · **Branch:** `main` @ `7c5e63e` · **Companion:** [HANDOVER.md](HANDOVER.md) (how to pick this up)

Update this file at the end of every work session. The detailed phase checklist is in [SIXTH_SENSE_FRONTEND_PLAN.md](SIXTH_SENSE_FRONTEND_PLAN.md); its top-level tracker still says Phase 5 is blocked, but that is out of date (see below).

## Health check (2026-11-18)

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ passes |
| `pnpm lint` | ✅ passes |
| `pnpm test` | ✅ 38 files, 340 tests passing |
| Backend tests (`sceneid-backend`) | ✅ 268 passing |

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
| Notifications, settings | 🟡 Pages exist; check against the backend's `notifications/` and `me/settings/` |
| End-to-end validation (plan §5.3) | ❌ Not done: no recorded run of sign-in → upload → analysis → publish → verify against a running backend |

## Recent work (newest first)

- `9495499` Profile editing: avatar presets, live username validation, "Their Leonida" area mosaic, category breakdown, SEO index rules.
- `3e7890a` / `340ec4b` / `795bb3d` / `0fd477e` Wallet sign-in via the backend, `AccountPanel`, session management, auth pages.
- `953c244` / `36d92d3` / `73e2531` / `bc55f69` GTA VI map: gtadb tiles and landmarks, layers, static map, location details.
- gtadb labelled as a community layer ("Community layer · gtadb.org · CC BY 4.0 · unofficial") per the 2026-11-18 decision.

## Open issues (ranked)

1. **No end-to-end run against the live backend.** Everything in Phase 5 is adapter code plus unit tests.
2. **Backend catalogue is empty** (0 regions, 0 locations, 0 entities locally): search, regions and analysis grounding return nothing until the official-names seed is approved and imported (backend task).
3. **Auth throttle through the proxy:** all sign-ins reach Django from the Next server's IP, so the backend's 10/min auth limit is shared by every player. Fix on the backend (`NUM_PROXIES` + forwarded IP) and forward `X-Forwarded-For` from the proxy.
4. **Wallet unlink locks wallet-only accounts out** (signing in again creates a new account). Needs a backend guard; the UI should warn or hide unlink until then.
5. **Uploads over 4.5 MB fail on Vercel** (function body limit) while the backend allows 10 MB. Fix: presigned uploads (not built on the backend).
6. **Leaderboard reputation likely inflated** by a `Sum` over multiple joins (backend).
7. **Username rename** and `check-username` don't exist on the backend.
8. **`SIXTH_SENSE_FRONTEND_PLAN.md` tracker is stale** (says Phase 5 blocked).

Resolved since the audit: the backend now accepts an empty `description` when publishing from an analysis.

## Decisions on record

| Date | Decision |
|---|---|
| 2026-11-17 | Rebrand SceneID → Sixth Sense; starburst logo final |
| 2026-11-18 | gtadb.org (CC BY 4.0) is the map base, self-hosted, labelled as an unofficial community layer, kept separate from backend verified data (the backend declines it over leak provenance) |
| 2026-11-18 | Map tiles synced from GitHub at build time (`pnpm map:sync`) and served statically; Vercel Blob dropped (upload quota) |
| 2026-11-18 | Sign-in is Solana wallet only, through the backend; JWTs stay in `ss_access` / `ss_refresh` HTTP-only cookies |
| — | Admin (4.12) paused by request |
