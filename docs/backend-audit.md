# Backend audit: SceneID Django API vs the Sixth Sense frontend

**Date:** 2026-11-18 · **Backend:** `~/Downloads/sceneid-backend` (commit `6e5fed6`) · **Read-only audit; nothing changed in either repo.**

---

## Summary

The backend is real and well built: Django REST under `/api/v1/`, 268 tests passing, wallet sign-in, discoveries, verification, reputation, notifications, Web3 attestations and a Claude-based analysis pipeline. Most frontend data-source methods map onto it with adapters.

**What blocks a full switch-over:**

1. **Map data policy conflict.** The backend refuses gtadb.org data as possibly leak-derived, and it has no coordinates, no base map and `tiles: null`. The frontend's World map is built on gtadb.
2. **The backend database is empty.** The only accepted GTA data (33 Rockstar-official names, no coordinates) sits unloaded, pending owner approval.
3. **Analysis can't run.** There is no `ANTHROPIC_API_KEY`, the pipeline has never been run against the live model, and in dev the upload request calls Claude synchronously.
4. **Features the frontend has that the backend lacks:** username rename and `checkUsername`, `avatarId`, profile `areas`/`byCategory`, `viewerIsOwner`, location `areas`/`tags`/`realWorldCounterpart`/`source`.

**Note:** the frontend working tree has **uncommitted Phase 5 adapter work** (`src/features/*/data/api-source.ts`, `src/lib/api/*`, the `src/app/api/backend/[...path]` proxy, and auth rewired to the backend's JWT wallet login). The findings below apply to it.

---

## 1. Conventions (verified in code)

| Topic | Backend |
|---|---|
| Base | `/api/v1/`, trailing slashes |
| Envelope | `{success, message, data}`. Errors: `{success:false, code, message, errors{field:[…]}}` |
| Pagination | `?page=&page_size=` (default 25, max 100) → `{count, page, page_size, total_pages, next, previous, results}`. A page past the end returns **404**, not an empty list |
| Auth | **JWT only.** Access token 30 min, refresh 7 days (rotating, blacklisted on logout). No sessions, so no CSRF |
| Wallet sign-in | `auth/wallet/challenge/` → `auth/wallet/login/`. ed25519 via PyNaCl. Single-use, 5-minute challenges. A new wallet needs `accept_terms`, otherwise **409** (and the challenge is burned) |
| CORS | `CORS_ALLOWED_ORIGINS` (default localhost:3000). Doesn't matter while the Next proxy is used |
| Throttling | auth 10/min, upload 30/h, comment 20/min. In-process memory only, so production needs Redis |
| OpenAPI | `/api/v1/schema`, but mostly untyped views, so not suitable for code generation |
| Media | Absolute URLs on the backend host (served only with `DEBUG=True`). S3 links are signed and expire after 300 s |

## 2. Data-source mapping

✅ matches · 🟡 needs an adapter · 🔴 missing on the backend

| Frontend | Backend | Status | Key differences |
|---|---|---|---|
| World `getWorldBounds` | `world/bounds/` | 🟡 | `null` unless `WORLD_BOUNDS` or approved regions exist (none do) |
| World `listRegions` | `world/regions/` | 🟡 | `public_id`. Bounds can be null. **Empty today** |
| World `listMarkers` | `world/markers/` | 🟡 | Markers are **discoveries, not places**. No `layer`/`areas`/`nameKnown`. Bug: the `bbox` filter drops region-only markers |
| World `getLocation` | `world/locations/{id}/` | 🟡 | snake_case. No areas, tags, real-world counterpart or source |
| Discoveries `listDiscoveries` | `discoveries/` | 🟡 | Same params. `contributor` is a **username string**, not an object. `location` is never null. Signed-in users see their own drafts/archived items in the public feed |
| `getDiscovery` | `discoveries/{id}/` | 🟡 | Use `contributor_info`. `viewer{…}` matches. Detections have no id and no band |
| `addComment` | `POST discoveries/{id}/comments/` | 🟡 | Returns the author as a username string |
| `suggestIdentification` / `addEvidence` | `…/suggestions/`, `…/evidence/` | ✅ | Backend categories only (no landmark/collectible) |
| `vote` | `POST …/votes/` | 🟡 | **`reason` required.** Contributor role or higher. Votes can't be changed |
| `report` / `setFollowing` | `reports/`, `users/{u}/follow/` | ✅ | |
| `submitDiscovery` | `POST discoveries/` | 🟡 | `analysis` = job id. `location` must be a backend location. A 409 with `data.duplicates` requires `force:true`. **Bug in the working-tree adapter:** an empty `description` gets a 400 |
| Analysis constraints | `analyses/constraints/` | ✅ | 10 MB, jpeg/png/webp, 64–8192 px |
| `upload` | `POST images/upload/` (field `image`) | 🟡 | Returns 200 for a duplicate image (with the old job). `jobId ← latest_analysis` |
| `getJob` | `analyses/{id}/` | 🟡 | More statuses. `error` is a string. No `completedAt`. `bbox` is `[x,y,w,h]`. `band` uses high/medium/low |
| `getProfile` | `users/{u}/` | 🟡 | Hidden `stats` members are null. No `avatarId`, `areas`, `byCategory`, `viewerIsOwner` |
| `getLeaderboard` | `leaderboard/` | ✅ | Same values. No avatars. **Likely backend bug: reputation inflated by Sum over joins** |
| `updateProfile` | `PATCH profiles/me/ {profile:{…}}` | 🟡/🔴 | **Username is read-only (no rename).** Avatar is a URL only |
| `checkUsername` | none | 🔴 | |
| Web3 config, challenge, transactions, rewards | `web3/config/`, `web3/wallet/challenge/`, `web3/wallet/transactions/`, `rewards/me/` | ✅ | Renames only |
| `linkWallet` / `getLinkedWallet` / attestations | `web3/wallet/verify/`, `web3/wallet/me/`, `attestations/public/` | 🟡 | Attestation `contributor` can be null |
| `unlinkWallet` | `DELETE web3/wallet/disconnect/` | ⚠ | **No guard: a wallet-only account locks itself out** (signing in again creates a new account) |
| Session | `auth/me/`, `auth/refresh/`, `auth/logout/` | ✅/🟡 | Wallet-only users: username `sol_xxxxxxxx`, empty display name |

## 3. Vocabularies

| | Frontend | Backend | Mapping |
|---|---|---|---|
| Category | 9 (incl. landmark, collectible) | 7 | landmark→location, collectible→object (lossy) |
| Precision | confirmed/approximate/region/unknown | exact/… | exact↔confirmed |
| Confidence band | high/moderate/low | high/medium/low | medium↔moderate |
| Job status | 4 | 7 | completed_partial→completed, cancelled→failed, uploaded→queued |
| Verification | 5 | discovery `status` (7) plus a mapped `verification` | draft/archived leak through for owners |
| Leaderboard, rewards, report reasons, votes | — | — | match or are mapped server-side |

## 4. GTA VI data stance

- `docs/gta-vi-data-integration.md:12`: gtadb is refused. The reasoning: *"CC BY 4.0 licenses the volunteers' work; it cannot cure leaked inputs or Rockstar's rights in game imagery."* gtadb's FAQ says it *"may derive information from the leaks."* Its derivatives (leonidamap, loreside, gtamap.io) are refused too.
- The only accepted source is `data/official/rockstar_gta6_official_names.json`: **13 regions + 20 entities, names only, no coordinates**. Its status is `pending_review` until an owner runs `approve_source … --rights-confirmed` and then `import_official_vi --apply`.
- `world/meta` reports coordinate system `sceneid-world-units` (no origin defined), `tiles: null` and `base_map.available: false`. The doc says an approved coordinate source would get a per-source affine transform at import.
- Users can't place pins: discoveries must reference an existing approved location or region.
- The local DB has 0 regions, 0 locations, 0 entities and 1 user.

## 5. Analysis

A real pipeline: `ClaudeAnalyzer` uses Anthropic tool use, model `claude-sonnet-5-5`. It is "catalogue-grounded": approved names go into the prompt, and the server only accepts exact name or alias matches; near misses become `candidates`. **But** there is no API key, it has never run live, the catalogue is empty, the confidence thresholds (0.85/0.55) are uncalibrated, and Celery runs eagerly in dev, so the upload request blocks on Claude.

## 6. Operations

- **Run locally:** `cd backend && .venv/bin/python manage.py migrate && .venv/bin/python manage.py runserver` (SQLite, eager Celery). `docker-compose.yml` only provides Postgres (port 5433) and Redis, with no app or worker service.
- **Tests:** 268 passed. CI exists but has never run.
- **Production needs:** Postgres, Redis (throttles and Celery), a worker plus beat, `ANTHROPIC_API_KEY`, `CORS_ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, S3, and email.

## 7. Bugs and risks, ranked

1. **Map data conflict** (policy decision needed: see below).
2. **Empty catalogue:** regions, search and analysis grounding all return nothing until the official seed is approved and imported.
3. **Analysis can't run** (no key; eager mode blocks requests).
4. **Auth throttle through the proxy:** every sign-in reaches Django from the Next server's IP, so the 10/min auth limit is shared by **all players** (about 5 sign-ins a minute). Forward the client IP (`X-Forwarded-For` + DRF `NUM_PROXIES`) or raise the limit.
5. **Wallet unlink lockout** for wallet-only accounts (all frontend users).
6. **`submitDiscovery` 400 on an empty description** (working-tree adapter).
7. **Leaderboard reputation likely inflated** (Sum over joins).
8. **Type mismatches the adapters must absorb:** nullable bounds, region-only markers without a `locationId`, null attestation contributor, null stats members.
9. **Branding:** user-facing "SceneID" strings (emails, the wallet sign-in message, the Swagger title, the analysis prompt, the timeline note). The on-chain memo prefix `sceneid:1:` is permanent once on mainnet, so decide before then.

## 8. Decisions for the owner

> **Decided 2026-11-18 — gtadb map:** keep it **on the frontend as a clearly labelled community layer** (option a). It stays separate from the backend's verified data: the backend does not import it, and the frontend labels it "Community layer · gtadb.org · CC BY 4.0 · unofficial", with a source note that the mapping project says some information may come from leaked material. Backend integration must keep serving the World map from the frontend snapshot until an approved coordinate source exists.

1. **gtadb map** (decided above): (a) keep it on the frontend as a community layer, clearly labelled, accepting the backend's leak concern; (b) remove it and wait for an approved coordinate source (the World map goes empty); or (c) get the legal advice the backend doc asks for, then import gtadb into the backend with an affine transform.
2. **Approve and import the official names seed** (`approve_source` + `import_official_vi --apply`).
3. **Backend additions the frontend already uses:** username rename + `check-username`, `avatar_id`, profile `areas`/`by_category`/`viewer_is_owner`, contributor objects in lists, an unlink guard, the throttle fix and the leaderboard fix.
4. **Rename the backend to Sixth Sense** (user-facing strings now, the on-chain prefix before mainnet).
