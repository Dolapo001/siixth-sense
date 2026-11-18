# Sixth Sense — Roadmap & Checklist

**Last verified:** 2026-11-18 · **Frontend:** `sceneid` `main` @ `1c4382b` · **Backend:** `sceneid-backend` `main` @ `8a78fce`

What is built, what is not, and the order to do the rest in. Companion to [HANDOVER.md](HANDOVER.md) (how to pick the work up) and [PROGRESS.md](PROGRESS.md) (session log and decisions). The phase checklist in [SIXTH_SENSE_FRONTEND_PLAN.md](SIXTH_SENSE_FRONTEND_PLAN.md) is the original spec; this file is the current truth where the two disagree.

Tick a box only when the item is done **and verified**. Items marked 🔒 are blocked on a person, not on code.

---

## Where we are at a glance

| | Frontend | Backend |
|---|---|---|
| Tests | ✅ 343 passing / 38 files | ✅ 280 passing |
| Typecheck / lint | ✅ / ✅ | — |
| Built features | 21 routes, design system, shell, 5 API adapters | Full API: auth, analysis, discoveries, community, reputation, web3, rewards, dev portal |
| Proven end to end | 🟡 sign-in → upload → analysis → publish (31 checks); comment, vote, attestation not yet | 🟡 one real Claude analysis verified; not yet on a real GTA VI screenshot |
| Real data loaded | gtadb community map only | ❌ 0 regions, 0 locations, 0 entities |

---

## Phases 1–4 — Done (for reference)

- [x] **Phase 1 — Reconnaissance.** Backend found and audited ([docs/backend-audit.md](docs/backend-audit.md), [docs/backend-endpoints.md](docs/backend-endpoints.md)).
- [x] **Phase 2 — Design foundation.** Tokens, primitives, motion, brand ([docs/brand-guidelines.md](docs/brand-guidelines.md)).
- [x] **Phase 3 — Application shell.** Rail, mobile nav, shared states, all routes stubbed.
- [x] **Phase 4 — Core experiences**, except where noted:
  - [x] 4.1 World Explorer · 4.2 Screenshot Analysis · 4.3 Discovery Feed · 4.4 Discovery Detail
  - [x] 4.5 Community & Verification · 4.6 Profiles · 4.7 Leaderboard · 4.8 Web3 Identity
  - [x] 4.9 Proof of Discovery · 4.10 Rewards · 4.11 Developer Portal · 4.13 Landing
  - [ ] 4.12 Admin — **paused by request**. `/admin` is a `PermissionDeniedState` stub. Resumes in Phase C.
- [x] **Phase 5.1 API architecture** — client, envelope handling, typed sources, proxy, TanStack Query.
- [x] **Phase 5.2 Missing endpoints** — documented, mocks isolated and labelled, off in production builds.

> The tracker at the top of `SIXTH_SENSE_FRONTEND_PLAN.md` still says Phase 5 is ⛔ blocked and leaves 5.1/5.2 unticked. That is stale — the adapters are built. Only 5.3 (end-to-end validation) is genuinely outstanding.

---

## Phase A — Close the loop

**Core journey and community actions work end to end (2026-11-18), 36 checks.** The adapters had never been exercised against a running backend. [`scripts/e2e-journey.mjs`](scripts/e2e-journey.mjs) now does it: it drives the real Next.js routes over HTTP with a cookie jar, signing the wallet challenges with a throwaway ed25519 keypair instead of a browser extension, so no Phantom install is needed. **31 checks, all passing**, covering sign-in → upload → analysis → publish → detail. Remaining: comment, vote, attestation, rewards (below).

```bash
node scripts/e2e-journey.mjs
```

Add `--analyse` for the upload → analysis → publish leg. To run it free and offline, start the backend with `ANALYZER_BACKEND=apps.intelligence.analyzer.SampleAnalyzer`; otherwise each run spends Claude credits. The harness sends a random TEST-NET `X-Forwarded-For` per run (override with `--ip`), so with the backend's `NUM_PROXIES=1` runs don't throttle each other.

Setup:

- [x] Backend up: `cd ~/Downloads/sceneid-backend/backend && .venv/bin/python manage.py runserver`
- [x] Frontend `.env.local` points at it (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1`)
- [ ] A second account with the `contributor` role, for voting (owners can't verify their own discoveries)

Validated against the live backend:

- [x] Wallet sign-in, **new** wallet — creates a wallet-only account, 409 `terms_required` without `accept_terms`
- [x] Wallet sign-in, existing wallet — returns to the same account, no duplicate created
- [x] Cross-site sign-in refused (403) and invalid addresses refused (400)
- [x] Sign-out clears `ss_access` / `ss_refresh` and the session reads back as signed out
- [x] Every read the adapters depend on: `auth/me/`, `users/{username}/`, `leaderboard/`, `discoveries/`, `regions/`, `world/markers/`, `analyses/constraints/`, `web3/config/`, `web3/wallet/me/`, `web3/wallet/transactions/`, `attestations/public/`, `rewards/me/`, `notifications/`, `notifications/unread-count/`, `me/settings/`
- [x] Discovery detail, including the server-computed `viewer` permissions block
- [x] Wallet link — confirmed it already happens *as part of* wallet sign-in; linking a second wallet is refused (409 at verify)

Still to do:

- [x] Screenshot upload — multipart through the proxy, 201, image re-encoded and dimensions returned
- [x] Analysis job starts automatically on upload and polls through its real async states to a terminal status
- [x] The adapter's failure path: a provider error surfaces as a rendered "Analysis failed" state, not a crash
- [x] A **successful** analysis — completes with detections (sample analyzer), and one real Claude call verified separately
- [x] Publish from analysis, with no note — the new discovery appears in the list and its detail loads
- [x] Wallet unlink refused by the backend for wallet-only accounts (409)
- [x] Per-client auth throttle: the same client is throttled, a second client straight after is not
- [x] Token refresh: an expired access token is swapped for a new one and the refresh token rotates; the player stays signed in
- [x] Comment, suggest an identification, add written evidence, follow/unfollow, report, all with optional fields left empty exactly as the adapter sends them
- [x] Vote refused for a non-contributor, with the server's reason
- [x] **Confirm always failed — fixed.** The backend requires a reason on every vote; the Confirm button sent none. Decision 2026-11-18: keep the backend rule and ask for a reason on Confirm too. The panel now opens a reason field for both votes, the type makes `reason` required end to end, and the mock source now mirrors the backend (reason required, votes final). The panel's "You can change your vote" was wrong — votes are final — and is gone.
- [ ] Entity results · [ ] Location results — both will return nothing until the catalogue is seeded (Phase D)
- [ ] A successful vote by a Verified Contributor (needs an account promoted to `contributor`)
- [ ] Attestation (devnet)
- [ ] Rewards screen against real records
- [ ] API integration tests against a seeded backend (plan §6.6) — the harness is the skeleton for these

### ✅ Analysis was broken against the real Claude API — fixed 2026-11-18

Found by running it: **no screenshot could be analysed.** `apps/intelligence/analyzer.py` forced JSON with `tool_choice={"type": "tool", "name": "report_scene"}`, and the current models reject forced tool choice (`tool_choice: type "tool" and "any" are not supported for this model.`). Now `{"type": "auto"}`, with the tool call requested in `SYSTEM_PROMPT` (the documented replacement); a reply without the call still fails the job cleanly. One real call verified: completed, structured output, and the model declined to invent GTA content for a non-game image.

Same area: a blank `ANTHROPIC_MODEL=` (exported by some shells, and real env vars beat every `.env` file) reached the API as `""`. Blank now counts as unset.

### What the first run turned up

1. **Every account could one-click lock itself out.** Sign-in is wallet-only, and wallet sign-in links the wallet, so *every* account has a linked wallet — and `/web3` rendered "Unlink wallet" unconditionally, with no confirmation. The backend's `DELETE web3/wallet/disconnect/` returned **204, unguarded**. Signing in again creates a *new* account, so the old one is gone for good. **Fixed on both sides**: the UI hides it and the backend now refuses it (409).
2. **The auth throttle was shared by everyone.** The harness tripped Django's 10/min auth limit on *itself* using different wallets and different accounts, because every sign-in arrives from the Next server's IP. Token refresh is in the same throttle scope, and a throttled refresh **signs the player out**, so under load players would have been logged out at random. **Fixed** (Phase B item 1).
3. **Publishing an analysis with no note failed.** The frontend sends `description: ""`; the backend's earlier fix only covered an *omitted* description, and DRF rejected the empty string. **Fixed** on the backend; from-scratch discoveries still require a note.
4. **Users see "SceneID" when they sign in.** The wallet signing prompt reads `SceneID wallet verification` — a user-facing string in the one screen every player must go through. Phase E rename.

Fixed in this pass:

- [x] `/api/auth/session` and `/api/auth/verify` now return a `walletOnly` flag (derived from the backend's `email: null`)
- [x] `/web3` hides "Unlink wallet" for wallet-only accounts and explains why, instead of offering an unrecoverable action
- [x] Regression test: "never offers to unlink the wallet an account signs in with"

---

## Phase B — Backend gaps the frontend is already hitting

Backend repo. Can run in parallel with Phase A; items 1–3 are bugs, 4–5 are missing surface.

- [x] **Auth throttle shared by every player** — fixed 2026-11-18. Backend `NUM_PROXIES` from env, default **0** (deliberately stricter than DRF's own default, which believes `X-Forwarded-For` from anyone). The frontend forwards the client address on sign-in, token refresh and every proxied call (`clientAddressHeaders()` in `src/lib/api/backend.server.ts`). ⚠ **Deployment must set `NUM_PROXIES=1`** (or the real proxy count) on the backend, or the header is ignored and the bucket is shared again.
- [x] **Unlink guard** — fixed 2026-11-18. 409 when the wallet is the only credential (no usable password, no *verified* email). Both routes covered.
- [x] **Forced tool-use rejected by the model** — fixed 2026-11-18, see Phase A.
- [x] **Blank `ANTHROPIC_MODEL` treated as a real value** — fixed 2026-11-18.
- [x] **`ANALYZER_BACKEND` env seam** — added 2026-11-18, with an offline `SampleAnalyzer`.
- [x] **Publishing with an empty note returned 400** — fixed 2026-11-18, see Phase A.
- [ ] **Leaderboard reputation inflated.** `Sum("reputation_events__points")` is annotated alongside `Count` over other joins — use a subquery.
- [ ] Username rename + `check-username` (frontend refuses renames today)
- [ ] `avatar_id` (avatar is stored as a URL to a preset as a workaround)
- [ ] Profile `areas` / `by_category` / `viewer_is_owner`
- [ ] Contributor objects instead of username strings in list responses
- [ ] **Presigned uploads** — Vercel caps request bodies at 4.5 MB while the backend accepts 10 MB, so large screenshots will fail in production

Frontend interim, until the unlink guard lands:

- [x] Hide "Unlink wallet" for wallet-only accounts (done 2026-11-18 — see Phase A)

---

## Phase C — Finish the frontend holes

Three places where a page exists but the feature does not.

**Notifications** — the backend API is complete and entirely unused. `/notifications` is still the Phase 3 `FeaturePlaceholder`: no data source, no adapter, no unread badge.

- [ ] `src/features/notifications/data/` — `source.ts` + `mock-source.ts` + `api-source.ts`
- [ ] List, pagination, mark-read (single and by `ids`)
- [ ] Unread count + badge on the nav item and mobile top bar
- [ ] Per-kind mute (`PUT notifications/preferences`)

**Settings** — `me/settings/` is never called anywhere in the frontend. The page is profile + account panel only.

- [ ] Wire `GET`/`PATCH me/settings/`
- [ ] Privacy flags (public profile, `attribute_discoveries_publicly`, wallet visibility)
- [ ] Account deletion (backend anonymises and revokes everything)

**Admin (4.12)** — un-pause when the owner says so. `admin/reports/*` already exists on the backend.

- [ ] Report moderation queue first (`GET admin/reports/queue`, resolve dismiss/action, `remove_content` / `warn_user`)
- [ ] Verification and dispute queues
- [ ] Admin stats

---

## Phase D — Real data and real AI

🔒 Mostly gated on the approvals at the bottom of this file. Until the catalogue is loaded, search, regions and analysis grounding return **nothing**.

- [ ] 🔒 Approve the official-names data source, then `approve_source … --rights-confirmed` and `import_official_vi --apply` (13 regions + 20 entities from rockstargames.com/VI)
- [ ] Run analysis against the real Claude API on a real GTA VI screenshot
- [ ] Tune `SYSTEM_PROMPT`, check bounding-box quality, confirm the vision model id
- [ ] Start an evaluation set and calibrate the confidence bands (0.85 / 0.55 are placeholders)
- [ ] Install `requirements-ml.txt` on the worker and run the real OpenCLIP model (`OpenCLIPEmbedder` has never executed)
- [ ] Calibrate `EMBED_SIMILAR_MIN` (0.80) and `EMBED_NEAR_DUPLICATE` (0.95) — both uncalibrated guesses
- [ ] Feed visual matches into entity matching in `images/tasks.py`
- [ ] Reward point values and reputation thresholds reviewed against real activity

---

## Phase E — Production

**Backend infrastructure**

- [ ] Postgres 16 + pgvector, Redis as the cache (throttles use per-process locmem today)
- [ ] Celery worker + beat (beat polls pending attestations; without it a pending tx stays pending forever)
- [ ] S3 on a real bucket (code ready, never run against one)
- [ ] SMTP (email goes to the console backend today)
- [ ] Secret store for `SECRET_KEY`, the Solana issuer key and the RPC URL
- [ ] First CI run on GitHub (`.github/workflows/ci.yml` has never executed)
- [ ] `DEBUG=false` production guard satisfied

**Frontend**

- [ ] Real-browser viewport checks: desktop, tablet, mobile (plan §6.1, §6.6 responsive)
- [ ] Re-render audit and paginated data loads (plan §6.3)
- [ ] Functional pass over the whole app (plan §6.7)
- [ ] Vercel env: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, later `SIXTH_SENSE_OPENAPI_URL`
- [ ] Backend `ALLOWED_HOSTS` includes the public host
- [ ] Hand-annotated OpenAPI — the auto schema is too thin for the developer portal to be useful

**Before launch**

- [ ] Rename remaining user-facing "SceneID" strings (emails, wallet sign-in message, Swagger title, analysis prompt)
- [ ] Decide the on-chain memo prefix (`sceneid:1:`) before any mainnet use — memos are public forever
- [ ] Commit or drop the uncommitted marketing kit (`scripts/generate-marketing-assets.mjs`, `public/brand/marketing/`, `brand:marketing`)
- [ ] Update the stale tracker at the top of `SIXTH_SENSE_FRONTEND_PLAN.md`

---

## 🔒 Needs a person, not code

These gate real chunks of the work above.

- [ ] Approve and import the official-names seed — **blocks all of Phase D**
- [ ] Legal view on gtadb.org / Rockstar material before any public launch
- [ ] Rotate the Alchemy API key that was shared in a chat
- [ ] Decide the reward currency and payout mechanism (no money moves today; `distribute` only records a reference)
- [ ] Licensed map coordinates and reference images
- [ ] Un-pause Admin (4.12) when ready

---

## Decisions on record

| Date | Decision |
|---|---|
| 2026-11-17 | Rebrand SceneID → Sixth Sense; starburst logo final |
| 2026-11-17 | Six spec-vs-reality decisions settled: memo kept, lowercase enums kept, devnet for dev, PostGIS skipped, S3 yes / presign not yet, Claude vision + brute-force embeddings |
| 2026-11-18 | gtadb.org (CC BY 4.0) is the map base on the frontend only, self-hosted, labelled an unofficial community layer; the backend declines to import it over leak provenance |
| 2026-11-18 | Map tiles synced from GitHub at build time and served statically; Vercel Blob dropped |
| 2026-11-18 | Sign-in is Solana wallet only, through the backend; JWTs stay in `ss_access` / `ss_refresh` HTTP-only cookies |
| 2026-11-18 | Every vote needs a reason, Confirm as well as Dispute; votes are final |
| — | Admin (4.12) paused by request |
