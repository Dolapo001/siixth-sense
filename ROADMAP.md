# Sixth Sense — Roadmap & Checklist

**Last verified:** 2026-11-18 · **Frontend:** `sceneid` `main` @ `1c4382b` · **Backend:** `sceneid-backend` `main` @ `8a78fce`

What is built, what is not, and the order to do the rest in. Companion to [HANDOVER.md](HANDOVER.md) (how to pick the work up) and [PROGRESS.md](PROGRESS.md) (session log and decisions). The phase checklist in [SIXTH_SENSE_FRONTEND_PLAN.md](SIXTH_SENSE_FRONTEND_PLAN.md) is the original spec; this file is the current truth where the two disagree.

Tick a box only when the item is done **and verified**. Items marked 🔒 are blocked on a person, not on code.

---

## Where we are at a glance

| | Frontend | Backend |
|---|---|---|
| Tests | ✅ 383 passing / 41 files | ✅ 323 passing |
| Typecheck / lint | ✅ / ✅ | — |
| Built features | 21 routes, design system, shell, 5 API adapters | Full API: auth, analysis, discoveries, community, reputation, web3, rewards, dev portal |
| Proven end to end | ✅ sign-in → analysis → publish → community → verified → devnet proof (46 checks) | 🟡 real Claude analysis verified; not yet on a real GTA VI screenshot |
| Real data loaded | gtadb community map only | ✅ official names: 13 regions, 20 entities (no coordinates) |

---

## Phases 1–4 — Done (for reference)

- [x] **Phase 1 — Reconnaissance.** Backend found and audited ([docs/backend-audit.md](docs/backend-audit.md), [docs/backend-endpoints.md](docs/backend-endpoints.md)).
- [x] **Phase 2 — Design foundation.** Tokens, primitives, motion, brand ([docs/brand-guidelines.md](docs/brand-guidelines.md)).
- [x] **Phase 3 — Application shell.** Rail, mobile nav, shared states, all routes stubbed.
- [x] **Phase 4 — Core experiences**, except where noted:
  - [x] 4.1 World Explorer · 4.2 Screenshot Analysis · 4.3 Discovery Feed · 4.4 Discovery Detail
  - [x] 4.5 Community & Verification · 4.6 Profiles · 4.7 Leaderboard · 4.8 Web3 Identity
  - [x] 4.9 Proof of Discovery · 4.10 Rewards · 4.11 Developer Portal · 4.13 Landing
  - [x] 4.12 Admin — **dropped (2026-11-18)**. The `/admin` route was removed. Moderation (reports, overrides) uses the backend's Django admin; discoveries are verified by community vote thresholds set on the backend.
- [x] **Phase 5.1 API architecture** — client, envelope handling, typed sources, proxy, TanStack Query.
- [x] **Phase 5.2 Missing endpoints** — documented, mocks isolated and labelled, off in production builds.

> The tracker at the top of `SIXTH_SENSE_FRONTEND_PLAN.md` still says Phase 5 is ⛔ blocked and leaves 5.1/5.2 unticked. That is stale — the adapters are built. Only 5.3 (end-to-end validation) is genuinely outstanding.

---

## Phase A — Close the loop

**✅ Essentially done (2026-11-18): 46 checks passing with `--verify`.** The adapters had never been exercised against a running backend. [`scripts/e2e-journey.mjs`](scripts/e2e-journey.mjs) now does it: it drives the real Next.js routes over HTTP with a cookie jar, signing the wallet challenges with a throwaway ed25519 keypair instead of a browser extension, so no Phantom install is needed. It covers sign-in → upload → analysis → publish → community actions → three confirmations → verified → reputation → devnet Proof of Discovery. Left: rewards with real amounts (no reward rules are seeded), entity/location results (need the catalogue), and turning the harness into CI integration tests.

```bash
node scripts/e2e-journey.mjs
```

Add `--analyse` for the upload → analysis → publish leg. To run it free and offline, start the backend with `ANALYZER_BACKEND=apps.intelligence.analyzer.SampleAnalyzer`; otherwise each run spends Claude credits. The harness sends a random TEST-NET `X-Forwarded-For` per run (override with `--ip`), so with the backend's `NUM_PROXIES=1` runs don't throttle each other. Add `--verify` for the verification chain: it promotes three throwaway accounts to `contributor` in the local DB and sends one public devnet transaction.

Setup:

- [x] Backend up: `cd ~/Downloads/sceneid-backend/backend && .venv/bin/python manage.py runserver`
- [x] Frontend `.env.local` points at it (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1`)
- [x] Contributor accounts for voting — `--verify` creates and promotes three per run

Validated against the live backend:

- [x] Wallet sign-in, **new** wallet — creates a wallet-only account, 409 `terms_required` without `accept_terms`
- [x] Wallet sign-in, existing wallet — returns to the same account, no duplicate created
- [x] Cross-site sign-in refused (403) and invalid addresses refused (400)
- [x] Sign-out clears `ss_access` / `ss_refresh` and the session reads back as signed out
- [x] Every read the adapters depend on: `auth/me/`, `users/{username}/`, `leaderboard/`, `discoveries/`, `regions/`, `world/markers/`, `analyses/constraints/`, `web3/config/`, `web3/wallet/me/`, `web3/wallet/transactions/`, `attestations/public/`, `rewards/me/`, `notifications/`, `notifications/unread-count/`, `me/settings/`
- [x] Discovery detail, including the server-computed `viewer` permissions block
- [x] Wallet link — confirmed it already happens *as part of* wallet sign-in; linking a second wallet is refused (409 at verify)

Then, with the fixes it led to:

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
- [x] **A screenshot whose analysis once failed could never be analysed again — fixed.** Re-uploading identical bytes returns the existing image, and the adapter reused its latest analysis even when that had failed, so the player saw the same old failure forever (spotted in the backend log from a browser retry). It now reuses an analysis only while it's running or once it has results, and otherwise starts a fresh one.
- [x] **Full verification chain, live (`--verify`)**: an owner publishes; three Verified Contributors confirm with reasons (each vote shown as final); the third confirmation verifies the discovery; the owner earns 10 reputation; the Proof of Discovery memo is confirmed on devnet ([transaction](https://explorer.solana.com/tx/5FHWPWJisGGyHR6jnytaMKn5Lm6dPhgJndDRT9sVBzv5jFsh1tDh8Q57so4ZtQrJ3vtWcxZyC3Zqs57fzgRcLyDB?cluster=devnet), checked independently on the RPC); it appears in the public attestations list; the rewards screen reads cleanly. Reviewers are promoted in the DB because the role is never client-settable, and `poll_pending()` stands in for celery beat.
- [ ] Rewards with real amounts — the screen reads cleanly, but no reward rules are seeded, so nothing is ever granted (`PUT /admin/rewards/rules`; rules wait on the payout decision under "Needs a person")
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

**Notifications** — ✅ done 2026-11-18, verified in the browser against the live backend (desktop and mobile).

- [x] `src/features/notifications/data/` — `source.ts` + `mock-source.ts` (mirrors the backend, labelled sample) + `api-source.ts`
- [x] List with All / Unread, pagination, mark one read, mark all read. The adapter never sends an empty mark-read body, which the backend reads as "mark everything read"
- [x] Each notification links to its page: discovery (comments jump to `#comment-<id>`, now anchored on the discovery page), profile, rewards, wallet, Analyze. Moderator warnings show the moderator's note
- [x] Unread badge on the rail bell and the mobile top bar; polls every 60s and on focus; in the link's accessible name ("Notifications, 4 unread"); rendered only after hydration
- [x] Mute by group (`PUT notifications/preferences`), keeping kinds the screen doesn't know about. Moderation (warnings, report outcomes) is never offered for muting
- [ ] Backend: `notify()` honours mutes for *every* kind, so the API would accept muting moderator warnings. Exempt `warning` (and probably `report_*`) on the backend
- [ ] "Open Analyze" can't open the specific analysis yet: the Analyze page has no job deep link (`/analyze?job=…`)

**Settings** — ✅ done 2026-11-18, verified in the browser against the live backend, including a real deletion of a throwaway test account.

- [x] Privacy: public profile, show wallet, show activity, credit me on my discoveries (`PATCH me/settings/`, only the flag that changed)
- [x] Email: add or change it, resend the verification link. **It was impossible to verify an email before:** the emailed link pointed at a `/verify-email` page that didn't exist, and the proxy blocked the verify and resend routes. Both fixed: new `/verify-email` page, and the proxy now allows `auth/verify-email` and `auth/resend-verification` (neither issues tokens; everything else under `auth/` is still refused)
- [x] `walletOnly` now matches the backend's unlink guard: only a **verified** email counts as another way in, so adding an unverified email no longer brings back an "Unlink wallet" the backend would refuse. `/web3` links straight to Settings to add one
- [x] Delete account: type DELETE (plus the password, for accounts that have one), with the consequences spelled out first, including that signing in with the same wallet afterwards starts a new, empty account. Signs out and returns home
- [x] **Hydration fix across the app:** `useSession()` now reads as pending until the calling component has hydrated. The rail fetching the session early (for the unread badge) made later boundaries (Settings' account panel) hydrate with a session the server never rendered. Regression test renders server HTML, hydrates with a cached session and asserts no hydration error

**Admin (4.12)** — un-pause when the owner says so. `admin/reports/*` already exists on the backend.

- [ ] Report moderation queue first (`GET admin/reports/queue`, resolve dismiss/action, `remove_content` / `warn_user`)
- [ ] Verification and dispute queues
- [ ] Admin stats

---

## Phase D — Real data and real AI

**Started 2026-11-18.** Everything that doesn't need real GTA VI screenshots is done; the rest waits for the game (out 2026-11-19).

- [x] Official-names source approved by the owner (`--rights-confirmed`, 2026-11-18) and imported: 13 regions + 20 entities. `regions/` returns 13 (also through the proxy), search finds them. Note the source is flagged **commercial use not allowed, AI training not allowed**
- [x] Grounding checked with real Claude calls on two synthetic images (no Rockstar material): a "Welcome to Vice City" sign → `candidate_location: Vice City`, certainty "likely", matched to the Vice City region at region precision; an "Ocean Drive Motel" sign → **no location**, not stretched to the catalogue's "Ocean Beach"
- [x] Vision model confirmed: `claude-sonnet-5-5` works once `tool_choice` is `auto` (fixed in Phase B)
- [x] Evaluation harness: `manage.py eval_analysis <folder>` (backend), with label format and how-to in `backend/data/eval/README.md`. Per-band accuracy against the 85% / 55% targets, catalogue precision and recall, invented names, location outcomes, suggested thresholds once there are 30+ detections. Spends nothing without `--yes`; caches raw output by image, model and prompt
- [ ] **Build the eval set from real screenshots** (50+ labelled, kept outside the repo), run it, then calibrate `CONFIDENCE_HIGH` / `CONFIDENCE_MEDIUM` and tune `SYSTEM_PROMPT` and bounding boxes from the report
- [x] OpenCLIP installed CPU-only in the backend venv (torch 2.15.0+cpu, open_clip 4.2.2, via `uv pip`; the venv has no pip) and **run for the first time**: 512-dim vectors, ~35 s first load then ~0.1 s per image. Sanity check on synthetic pairs: re-encoded copy 0.989 (near-duplicate, as intended), same layout with a different sign 0.533, unrelated logo 0.243
- [ ] **Switch it on**: add `EMBEDDER_BACKEND=apps.intelligence.embeddings.OpenCLIPEmbedder` to the backend env, restart, then `manage.py embed_missing` to backfill existing images. In Celery eager mode, embedding runs inside the upload request (~0.1 s, plus ~35 s once per server process for the model load)
- [ ] Calibrate `EMBED_SIMILAR_MIN` (0.80) and `EMBED_NEAR_DUPLICATE` (0.95) on real screenshot pairs (same spot from different angles, re-uploads, different spots)
- [ ] Pin the CPU wheel for deploys: `requirements-ml.txt` is unpinned, and a plain pip install on Linux pulls the multi-GB CUDA build
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

- [ ] Rename remaining user-facing "SceneID" strings (emails, wallet sign-in message, Swagger title, analysis prompt, the rewards requirements text "Every reward is reviewed by SceneID staff", the verification email subject and sender "Verify your SceneID email" from "SceneID <no-reply@…>", the `sceneid` attestation issuer)
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
