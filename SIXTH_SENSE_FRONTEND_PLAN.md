# Sixth Sense — Frontend Development Plan (Phased)

**Document type:** Frontend Engineering & Implementation Specification
**Product:** Sixth Sense
**Version:** 1.0
**Status:** Approved design and implementation direction
**Framework:** Next.js, React, TypeScript
**Primary objective:** Build a production-ready, immersive visual intelligence platform for exploring the GTA VI game world.

> **The world is the interface.**
> The map, screenshot analysis, discovery feed, community, profiles and Web3 functionality must reinforce one another as one cohesive visual intelligence environment, not a generic dashboard or a set of disconnected pages.

**How to use this file:** tick a box (`- [x]`) when the item is done and verified. Leave it `- [ ]` until then. Mark blocked items with **⛔ Blocked:** and the reason.

---

## Progress Tracker

| Phase | Name | Status |
|---|---|---|
| 0 | Product & Rules Reference | Reference only |
| 1 | Repository Reconnaissance | 🟡 Scaffold done, backend contract blocked |
| 2 | Design Foundation | ✅ Done |
| 3 | Application Shell | ✅ Done |
| 4 | Core Product Experiences | 🟡 4.1–4.11 and 4.13 done · 4.12 Admin paused |
| 5 | Backend Integration | ⛔ Blocked on backend contract |
| 6 | Production Readiness | 🟢 Done for the frontend · remaining: real-browser viewport tests, API integration tests (need backend) |

- [ ] Phase 1 — Repository Reconnaissance
- [x] Phase 2 — Design Foundation
- [x] Phase 3 — Application Shell
- [ ] Phase 4 — Core Product Experiences
- [ ] Phase 5 — Backend Integration
- [ ] Phase 6 — Production Readiness

Implement incrementally. Test each major experience before moving to the next. Do not stop at a visually attractive prototype.

---

# PHASE 0 — Product & Rules Reference

This phase isn't build work. It's the context every later phase depends on, so it has no checkboxes.

## 0.1 Role

You are the lead frontend engineer and product interface architect. Think like a senior frontend engineer working alongside a product designer. You must:

- Understand the product before implementing individual pages.
- Inspect the existing repository and understand its architecture.
- Preserve working functionality.
- Build reusable components and consistent design systems.
- Implement meaningful interactions, not decorative controls.
- Integrate with the actual backend API contracts.
- Avoid fabricated data, endpoints and functionality.
- Maintain a consistent visual language across the platform.
- Prioritise performance, accessibility and maintainability.

## 0.2 What is Sixth Sense?

Sixth Sense is an AI-powered visual intelligence and discovery platform for GTA VI. A player uploads a gameplay screenshot; Sixth Sense analyses it, identifies visible entities, searches its knowledge base, suggests matches and connects results to locations and community discoveries.

It is **not** a game, a GTA VI clone or an image-generation app. It is a visual intelligence layer built around the game world.

### Core experience

For a screenshot containing e.g. a sports car, a building, an animal and a street/landmark, Sixth Sense presents:

1. The uploaded screenshot.
2. Detected entities (multiple per screenshot).
3. Suggested entity identities.
4. Confidence scores and supporting evidence.
5. Possible location matches (only when sufficient reference data exists).
6. Related discoveries.
7. Community verification status.
8. An option to explore the location on the map.

Never assume a confident entity or location match. The UI must clearly distinguish:

- Confirmed matches
- AI-suggested matches
- Community-verified discoveries
- Uncertain matches
- No available match

## 0.3 Brand identity

The colours, typography, visual direction and logo are **locked**. The product was rebranded from its working name, Sixth Sense, to **Sixth Sense** (see `docs/brand-guidelines.md`).

### Logo — final: "The Sixth Sense Starburst"

- A custom eight-point starburst in Signal Cyan: the primary brand mark, used on its own wherever possible.
- **SIXTH SENSE** wordmark in custom geometric capitals; official tagline **SEE BEYOND THE SCENE.**
- Full specification, construction and usage rules: [`docs/brand-guidelines.md`](docs/brand-guidelines.md).

Do **not** use AI brains, robots, neural-network symbols, circuit boards, Rockstar/GTA logos, or unlicensed GTA VI artwork.

**The logo stays centralised:**

- All logo geometry lives in `components/brand/geometry.ts`, exposed as `<SixthSenseSymbol />`, `<SixthSenseWordmark />` and `<SixthSenseLogo />` (plus `BrandLoader`, `BrandReveal`, `SignalMark`).
- No page or component embeds logo SVG/paths directly. They import the brand components only.
- Favicon, app icons, OG/Twitter images and the files in `public/brand/` are generated from the same geometry (`pnpm brand:assets`).

### Colour system

| Token | Hex | Purpose |
|---|---|---|
| Midnight | `#0B1018` | Main application background |
| Electric Cyan | `#55D6D0` | Primary accent and interactive emphasis |
| Off-white | `#F2F4F5` | Main text |
| Steel Grey | `#8995A5` | Secondary text |
| Signal Orange | `#F29B52` | Warnings and selected highlights |
| Surface | `#111A25` | Primary elevated surfaces |
| Surface Elevated | `#172331` | Secondary elevated surfaces |
| Border | `#273443` | Subtle borders |

- Cyan: meaningful actions, selected states, active map markers, key intelligence indicators.
- Orange: sparingly — warnings, unusual discoveries, attention-worthy info.
- Do not make every element glow.

### Typography

Modern geometric sans-serif; technical, cinematic, contemporary.

- Strong display type for major page headings (not oversized everywhere).
- Clear hierarchy: page title → section heading → body.
- Compact metadata type for coordinates, timestamps, confidence values, IDs.
- Readable on small screens; one consistent type scale.

## 0.4 Design philosophy

**The world is the interface.** Sixth Sense should feel like an intelligence system for exploring a digital world — not a SaaS dashboard with a dark background. Achieve this through an interactive world map, cinematic transitions, layered intelligence panels, spatial navigation, image-analysis overlays, discovery markers, contextual information, mission-inspired interaction patterns and controlled animation.

**GTA-inspired, not GTA-copied.** Do not copy Rockstar UI assets, GTA logos, copyrighted menus, proprietary map designs, exact game UI layouts, or unlicensed screenshots/artwork.

**Avoid generic AI dashboard design:** no admin dashboard as the main experience, endless rectangular cards, generic gradients, large glowing buttons, excessive glassmorphism, unnecessary charts, repeated KPI cards, empty decorative panels, or a chat interface as the primary experience.

## 0.5 Technology stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Motion for React |
| Maps | MapLibre GL JS (or equivalent) |
| API state | TanStack Query |
| Local state | Zustand (only where genuinely needed) |
| Forms | React Hook Form |
| Validation | Zod |
| Icons | Lucide React |
| Charts | Recharts (when justified) |
| Wallet | Solana Wallet Adapter |

No extra dependencies without a clear reason. Server data stays in TanStack Query, not a global store.

## 0.6 Mandatory implementation rules

1. Do not redesign the approved Sixth Sense identity (colours, typography, logo, visual direction). Keep all logo artwork centralised in `components/brand/`.
2. Do not turn the application into a generic SaaS dashboard.
3. Do not invent backend endpoints.
4. Do not fabricate GTA VI locations, coordinates or confirmed discoveries.
5. Do not represent mock data as real production data.
6. Do not claim AI recognition succeeded before receiving a successful backend result.
7. Do not implement video uploads in the initial scope.
8. Do not make wallet connection mandatory.
9. Do not expose secrets in frontend code.
10. Do not remove existing functionality without understanding its purpose.
11. Do not build every feature inside one massive component.
12. Do not use excessive glassmorphism, gradients or glow effects.
13. Do not sacrifice accessibility for visual effects.
14. Do not leave important buttons non-functional.
15. Do not introduce unnecessary dependencies.
16. Do not use copyrighted Rockstar assets without appropriate permission.
17. Do not assume the availability of official Rockstar APIs or integrations.

---

# PHASE 1 — Repository Reconnaissance

**Goal:** Understand what exists before writing code.
**Findings:** see [docs/phase-1-assessment.md](docs/phase-1-assessment.md).

## 1.1 Repository audit

- [x] Inspect the project structure — *greenfield: folder held only this plan*
- [x] Read `package.json` — *none existed; created by scaffold*
- [x] Inspect the Next.js configuration
- [x] Inspect styling and theme configuration
- [x] Review existing components — *none*
- [x] Review routing — *none*
- [x] Inspect API integration — *none*
- [x] Identify reusable assets — *none; no logo asset yet*
- [x] Identify existing bugs and incomplete features — *n/a*
- [x] Document architectural constraints (Next.js 16: `cacheComponents`, `proxy.ts`, Tailwind v4)

## 1.2 Project scaffold

- [x] Next.js 16.4 + React 19 + TypeScript (strict) + Tailwind v4 + ESLint, pnpm
- [x] Target folder structure created (below), incl. `components/brand/`
- [x] Boilerplate removed; Sixth Sense metadata set
- [x] `.env.example` with `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`
- [x] `typecheck` script added
- [x] git initialised on `main`
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` pass

## 1.3 Backend contract discovery

- [ ] ⛔ Blocked: backend API documentation — *not found*
- [ ] ⛔ Blocked: OpenAPI/Swagger schema — *not found*
- [x] Existing frontend API clients — *none*
- [ ] ⛔ Blocked: authentication requirements
- [ ] ⛔ Blocked: request/response structures
- [ ] ⛔ Blocked: asynchronous processing states
- [ ] ⛔ Blocked: pagination conventions
- [ ] ⛔ Blocked: error response formats

## 1.4 Target folder structure

```text
src/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (platform)/
│   └── admin/
├── components/
│   ├── ui/  layout/  navigation/  maps/  analysis/  brand/
│   ├── discoveries/  community/  profiles/  web3/  shared/
├── features/
│   ├── authentication/  world/  image-analysis/  discoveries/
│   ├── community/  leaderboard/  rewards/  web3/  developers/
├── hooks/
├── lib/
│   ├── api/  utilities/  validation/
├── services/
├── stores/
├── types/
└── styles/
```

## 1.5 Deliverables

- [x] Repository assessment / scaffold summary
- [x] List of missing backend capabilities and the frontend features that depend on them
- [ ] ⛔ Blocked: backend contract notes (endpoints, auth, async states, pagination, errors)
- [ ] Answers to open questions in the assessment (backend location, map asset, auth, Solana network, final logo)

---

# PHASE 2 — Design Foundation

**Goal:** A design system every page builds on, implementing the locked brand.
**Review it:** run `pnpm dev` and open `/design-system` (development only; 404 in production).

Notes:
- Tokens live in `src/app/globals.css` (`@theme`). Tailwind's default palette is removed, so only brand colours are available (`bg-accent`, `text-muted`, `border-border`, …).
- Fonts: Sora (geometric sans) and JetBrains Mono (metadata), via `next/font`.
- Confidence thresholds (High ≥ 0.8, Moderate ≥ 0.5) are placeholders until the backend defines its scale.
- Tests: Vitest + Testing Library (`pnpm test`), 38 passing.

## 2.1 Tokens and type

- [x] Eight colour tokens from §0.3 in Tailwind `@theme` / CSS variables (no hardcoded hex in components)
- [x] Geometric sans-serif via `next/font`
- [x] Type scale: display, heading, body, compact metadata
- [x] Spacing scale
- [x] Border system
- [x] Surface treatments (Surface / Surface Elevated / Border)
- [x] Responsive breakpoints (desktop, laptop, tablet, mobile)

## 2.2 Brand

- [x] `<SixthSenseSymbol />`, `<SixthSenseWordmark />`, `<SixthSenseLogo />` in `components/brand/` (final Sixth Sense starburst)
- [x] Logo replaceable by editing only `components/brand/` (plus regenerating icons)
- [x] Favicon, app icons and OG image generated from the same logo source

## 2.3 Primitives

- [x] Button variants
- [x] Form controls (React Hook Form + Zod pattern)
- [x] Badges
- [x] Tooltips
- [x] Verification badges: AI suggested / Awaiting verification / Verified / Disputed / Rejected (icon + text, not colour alone)
- [x] Confidence labels: High / Moderate / Low (+ numeric when provided)
- [x] Modal (accessible, focus-trapped)
- [x] Drawer / bottom sheet (accessible, focus-trapped)

## 2.4 Motion

- [x] Shared Motion presets (durations, easings)
- [x] `prefers-reduced-motion` support built into presets

Animation rules (apply everywhere): no animation overload, constant pulsing or unnecessary parallax; keep interactions responsive; never delay access to important information; never animate fake processing; performant on ordinary laptops and mobile.

## 2.5 Deliverables

- [x] Tokens, type scale and primitives implemented
- [x] Swappable logo components
- [x] Verification and confidence components
- [x] Modal / drawer / bottom-sheet patterns
- [x] Test tooling set up
- [x] Component tests for core primitives

---

# PHASE 3 — Application Shell

**Goal:** Navigation, layouts and routes so every area of the product is reachable and consistent.

Notes:
- Nav config lives in `src/components/navigation/nav-items.ts`. Desktop/tablet: icon rail with tooltips. Mobile: top bar + bottom bar (World, Discover, Analyze, Community, More); "More" opens a sheet with everything else.
- Active-link highlighting sits inside `<Suspense>` (Next 16 `cacheComponents` requirement), so every page still prerenders.
- Platform, auth and admin pages are `noindex`. Placeholder pages say what they're waiting on; no fake content.
- `pnpm typecheck` now runs `next typegen` first, so route types are never stale.
- Tests: 55 passing.

## 3.1 Navigation

Primary: **World · Analyze · Discover · Community · Leaderboard · Profile**
Secondary (organised by importance): Rewards, Web3 Identity, Developer Portal, Settings, Notifications.

- [x] Desktop: persistent compact navigation
- [x] Desktop: clear active state
- [x] Desktop: accessible tooltips for icon-only items
- [x] Desktop: profile and notification access
- [x] Mobile: purpose-built navigation (e.g. bottom nav), not a shrunken sidebar
- [x] Mobile: important actions stay reachable
- [x] Smooth page transitions (subtle, reduced-motion aware)

## 3.2 Routes

- [x] `(marketing)`, `(platform)` route groups plus `auth/` and `admin/` folders, each with its own layout (auth is a plain folder so URLs keep the `/auth/` prefix)
- [x] `/` (landing)
- [x] `/world`, `/world/[locationId]`
- [x] `/analyze`
- [x] `/discoveries`, `/discoveries/[discoveryId]`
- [x] `/community`
- [x] `/leaderboard`
- [x] `/profile`, `/profile/[username]`
- [x] `/rewards`
- [x] `/web3`
- [x] `/developers`
- [x] `/notifications`
- [x] `/settings`
- [x] `/admin`
- [x] `/auth/login`, `/auth/register`, `/auth/callback`

## 3.3 Shared page states

- [x] Loading — skeletons or meaningful indicators
- [x] Empty — explain why, offer a next action
- [x] Error — clear message + retry
- [x] Unavailable — distinguish missing backend capability from empty results
- [x] Permission denied — explain why and what the user can do

Never leave a blank page or a broken spinner.

## 3.4 Deliverables

- [x] Every route reachable on desktop and mobile
- [x] Placeholder pages use the shared states (no fake content)

---

# PHASE 4 — Core Product Experiences

**Goal:** Build each module in engineering dependency order. Test each before moving to the next. This order is a dependency sequence, not permission to drop later modules.

Component rules for all of Phase 4: one responsibility per component, no oversized page components, API logic separated from UI, typed props, reuse shared patterns, prefer server components, avoid unnecessary client components, avoid abstractions that make simple things harder.

Until Phase 5, modules are built against typed interfaces and **clearly labelled dev mocks** kept in their own folder, never shown as real data.

## Module checklist

- [x] 4.1 World Explorer (sample data until Phase 5)
- [x] 4.2 Screenshot Analysis (sample data until Phase 5)
- [x] 4.3 Discovery Feed (sample data until Phase 5)
- [x] 4.4 Discovery Detail (sample data until Phase 5)
- [x] 4.5 Community & Verification (sample data until Phase 5)
- [x] 4.6 User Profiles (sample data until Phase 5)
- [x] 4.7 Leaderboard (sample data until Phase 5)
- [x] 4.8 Web3 Identity (sample data until Phase 5)
- [x] 4.9 Proof of Discovery (sample data until Phase 5)
- [x] 4.10 Rewards (sample data until Phase 5)
- [x] 4.11 Developer Portal (reference appears once the backend publishes its OpenAPI document)
- [ ] 4.12 Admin Interface (⏸ paused by request; first feature will be a report moderation queue)
- [x] 4.13 Landing Page (original placeholder artwork; see docs/landing-assets.md)

---

## 4.1 World Explorer — `/world`, `/world/[locationId]`

**The central product experience and the most distinctive page.** It should feel like opening an interactive intelligence map of the game world.

Notes:
- Data comes through `WorldDataSource` (`src/features/world/data/source.ts`). Dev uses a labelled sample source; production with no API shows "Map not connected" (verified). Phase 5 adds the API source.
- MapLibre draws only a placeholder grid in Sixth Sense's own coordinate space (`coordinates.ts`); markers are an accessible React overlay with `supercluster` clustering.
- `/world/[locationId]` is the source of truth for selection (deep links, back button). The explorer lives in `world/layout.tsx` so the map isn't rebuilt on selection.
- No WebGL2 → list mode (search, filters and panels still work).
- MapLibre v6's worker is copied to `public/vendor/` by `scripts/copy-maplibre-worker.mjs` (runs before dev/build).
- Verified with real WebGL in headless Chrome at desktop and mobile sizes.

### Layout

- [x] Full-width interactive map as the dominant visual (not a small card among widgets)
- [x] Floating navigation and map controls
- [x] Search interface
- [x] Category filters
- [x] Compact map legend
- [x] Contextual location panel
- [x] Optional intelligence sidebar — "Not on the map" panel lists region-only and unknown locations
- [x] Mobile: full-screen map with bottom sheet

### Map functionality

- [x] Pan
- [x] Zoom
- [x] Region navigation
- [x] Location selection
- [x] Discovery markers
- [x] Marker clustering
- [x] Category filters
- [x] Search
- [x] Selected-location details
- [x] Discovery previews
- [x] Distinguishable markers per category: Locations & landmarks · Vehicles · Characters & NPCs · Wildlife · Objects & collectibles · Events & activities · Hidden discoveries

### Location panel

- [x] Name, region, description
- [x] Associated discoveries
- [x] Related entities
- [x] Verification info
- [x] Community activity
- [x] Relevant screenshots

### Map constraints (critical)

- [x] No invented GTA VI coordinates
- [x] Precision levels rendered distinctly: Confirmed · Approximate · Region only · Unknown
- [x] Custom game-world coordinate system (never GPS)
- [x] Clearly labelled fallback when no permitted map dataset exists
- [x] Map data adapter interface so the real source plugs in without a rewrite

### Motion

- [x] Smooth panel transitions
- [x] Marker selection feedback
- [x] Controlled map movement
- [x] Discovery detail transitions

### Exit criteria

- [x] Works with mouse and keyboard (markers are real buttons; map canvas takes arrow keys and +/−)
- [ ] Touch tested on a real phone/tablet (MapLibre handles pinch/drag; not yet tried on a device)
- [x] Tests for filtering, selection and panel behaviour

---

## 4.2 Screenshot Analysis — `/analyze`

Notes:
- Data comes through `AnalysisDataSource` (`src/features/image-analysis/data/source.ts`). Dev uses a labelled sample service (nothing leaves the browser; a file named with "fail" produces a failed job). Production with no API shows "not connected". Phase 5 adds the API source.
- `state.ts` is a tested state machine for the browser-side steps; after upload, the status shown is only what the service reports. Results render only on `completed` (covered by `analyze-flow.test.tsx`).
- Boxes use 0–1 coordinates positioned in % over a shrink-wrapped image, so they stay aligned at any size. Detections without a box are listed with "Position in screenshot not provided".
- Upload limits (20 MB; PNG/JPEG/WebP) are placeholders on the data source until the backend defines them.

### Upload (images only — no video)

- [x] Drag & drop
- [x] File picker
- [x] Image preview
- [x] File validation (Zod)
- [x] Upload progress
- [x] Cancellation where supported (AbortSignal passed to the source)
- [x] Clear error states
- [x] Submission confirmation

### Analysis sequence (driven by real backend states)

- [x] Screenshot appears in the workspace
- [x] Scanning indicator while processing
- [x] Detection overlays when results arrive
- [x] Identified entities displayed
- [x] Confidence and evidence presented
- [x] Possible locations displayed
- [x] Related discoveries surfaced
- [x] States follow backend exactly: `idle → uploading → uploaded → queued → processing → completed | failed`
- [ ] ⛔ Blocked: polling vs push matches real backend capability. Currently polls via `pollIntervalMs` on the data source; no WebSockets assumed

### Detection overlays (only when bounding boxes are returned)

- [x] Boxes rendered over the screenshot
- [x] Selected detection highlighted
- [x] Label + confidence
- [x] Multiple detections
- [x] Stay aligned when the image scales
- [x] No invented boxes when the backend doesn't return them

### Per-entity results

- [x] Name / suggested identity
- [x] Category
- [x] Confidence (High / Moderate / Low + numeric if provided)
- [x] Description
- [x] Verification status
- [x] Related discoveries and locations
- [x] Evidence
- [x] Link to the map

### Exit criteria

- [x] Upload validation and error tests
- [x] State transition tests (including `failed`)
- [x] Overlay alignment checked at all viewport sizes
- [x] Screen-reader status updates for processing state

---

## 4.3 Discovery Feed — `/discoveries`

Notes:
- Data comes through `DiscoveryDataSource` (`src/features/discoveries/data/source.ts`); filtering, sorting and paging happen in the source (server-side for the API). Dev mock is derived from the World sample data so map ↔ discovery ↔ analysis links resolve (tested).
- Filters, sort and page live in the URL (`query.ts`, lenient parsing). Filter changes replace history; pagination uses real links.
- Editorial layout: a lead story on the unfiltered first page, then a dated ledger of rows.
- Sample discoveries have no screenshots; thumbnails show an honest "No screenshot" frame, never stand-in game imagery.

- [x] Distinctive editorial layout (not repeated generic cards)
- [x] Each item: thumbnail, title, category, location/region, contributor, verification status, timestamp, engagement
- [x] Search
- [x] Category filter
- [x] Region filter
- [x] Verification filter
- [x] Sorting
- [x] Pagination or infinite scroll (never load the whole dataset)
- [x] Filters/sort reflected in URL
- [x] Interaction tests

## 4.4 Discovery Detail — `/discoveries/[discoveryId]`

- [x] Main screenshot
- [x] Description
- [x] Detected entities
- [x] Location context (link to map)
- [x] Related discoveries
- [x] Evidence
- [x] Contributor
- [x] Verification history
- [x] Community discussion (read-only; posting comes with 4.5 and sign-in)
- [x] On-chain attestation info where available (explicitly not presented as proof the discovery is correct)

---

## 4.5 Community & Verification — `/community`

Notes:
- Actions live on `DiscoveryDataSource` (comment, suggest identification, add evidence, confirm/dispute, report, follow). Each discovery carries server-decided `viewer` permissions with refusal reasons; the UI never computes eligibility or status (a vote returns the discovery as the server now sees it).
- Session comes from `features/authentication/session.ts`: a labelled sample viewer in dev, none in production, so every action shows "Sign in to …" instead of a dead button.
- The dev mock's status rule (a dispute marks it disputed; 10+ confirmations with no open disputes verifies it) is a placeholder documented in the mock only.
- `/community` hosts review queues (Needs review, oldest first · Disputed · AI suggested) in the URL, plus a plain-language status guide.
- Forms use React Hook Form + Zod; on failure they keep the user's input and show the server's reason.

- [x] Discuss discoveries
- [x] Comment on submissions
- [x] Suggest alternative identifications
- [x] Submit supporting evidence
- [x] Verify eligible discoveries
- [x] Dispute incorrect discoveries
- [x] Follow contributors (where supported)
- [x] Highly visible, distinct status: AI suggested · Awaiting verification · Verified · Disputed · Rejected
- [x] AI results never shown as community-verified
- [x] Moderation and reporting interactions (reporting for discoveries and comments; moderator tools are part of 4.12 Admin)

---

## 4.6 User Profiles — `/profile`, `/profile/[username]`

Notes:
- Data comes through `ProfileDataSource` (`src/features/profiles/data/source.ts`). The dev mock derives every stat from the discovery sample data, so profiles, leaderboard and feed agree (tested). Its reputation formula is a placeholder; the real one is the backend's.
- Submitted and Verified are separate tabs (`?tab=verified`), powered by a new `by=<username>` filter on the discovery feed (also shown as a removable chip there).
- `/profile` is the signed-in viewer's own profile; signed out, it asks them to sign in.
- Wallets show "Not verified" unless the backend says the signature flow completed.
- Next 16 with `cacheComponents` keeps recently visited routes mounted but hidden (React `<Activity>`) for instant Back. DOM-based checks should only count visible elements.

- [x] Avatar, username, bio, join date
- [x] Contribution stats
- [x] Verified discoveries
- [x] Reputation score
- [x] Achievements
- [x] Recent discoveries
- [x] Optional wallet identity
- [x] Submitted vs verified discoveries clearly separated

## 4.7 Leaderboard — `/leaderboard`

- [x] Ranking dimensions: verified discoveries, quality contributions, verification activity, reputation, eligible rewards
- [x] Never ranked purely by upload count
- [x] Time filters: Weekly / Monthly / All-time (shown only for periods the backend reports as supported)

---

## 4.8 Web3 Identity — `/web3`

Notes:
- Data comes through `Web3DataSource` (`src/features/web3/data/source.ts`): wallet linking, transactions, attestations and rewards. Devnet only.
- Wallet code (Solana Wallet Adapter, Wallet Standard discovery, no auto-connect) loads only under `/web3` via its layout. UI takes a `WalletControls` interface, so it's tested without a wallet.
- Ownership = sign a one-time, expiring, single-use message (never a transaction); the server checks the Ed25519 signature. The dev mock performs the real check with WebCrypto; tests use real keypairs and cover forged, replayed and expired signatures.
- `@solana/web3.js` is pinned to v1 because the wallet adapter requires it.

- [x] Product fully usable without a wallet
- [x] Wallet connection
- [x] Identity display
- [x] Connection status
- [x] Disconnect
- [x] Signature-based auth (if backend supports it)
- [x] Transaction history (where available)
- [x] Never request seed phrases or private keys
- [x] Wallet shown as verified only after the verification flow completes

## 4.9 Proof of Discovery — `/web3/proof`

- [x] Attestation fields: discovery reference, contributor wallet, transaction signature, verification status, timestamp, network, explorer link
- [x] Clear distinction between community verification and on-chain attestation
- [x] Explains that an attestation proves Sixth Sense recorded the event, not that the discovery is factually correct

## 4.10 Rewards — `/rewards`

- [x] Eligible activity
- [x] Reward history
- [x] Pending rewards
- [x] Completed rewards
- [x] Eligibility requirements
- [x] Transaction references
- [x] Rewards never shown as earned just for uploading; reflect real backend eligibility and status (sample payouts also wait for a verified wallet)

---

## 4.11 Developer Portal — `/developers`

Notes:
- The reference is generated only from the backend's OpenAPI 3 document at `SIXTH_SENSE_OPENAPI_URL` (legacy `SCENEID_OPENAPI_URL` still read) (server-side, cached hourly with `"use cache"`). Unset shows "API reference not published yet"; no Sixth Sense endpoints exist anywhere in the frontend.
- Server-rendered with no page JavaScript; indexable (`index, follow`, canonical URL). Document text is rendered as plain text, never HTML.
- Parser handles local `$ref`s, circular schemas, `allOf`/`oneOf`, path-parameter overrides, bearer/API-key auth for curl samples; tested with a generic example document that lives only in the tests. Verified in a real production build against a locally served document.

- [x] Introduction
- [x] API overview (from the document's info and servers)
- [x] Authentication docs (from the document's security schemes)
- [x] Endpoint docs from the actual backend contract (renderer ready) · ⛔ waiting on the backend to publish its OpenAPI document
- [x] Request/response examples (document examples, else labelled "shape generated from the schema"; curl per endpoint)
- [ ] ⛔ Blocked: API key management (no key endpoints in a backend contract yet; section says so)
- [ ] ⛔ Blocked: usage info (backend doesn't report it yet; section says so)
- [x] Error docs (4xx/5xx merged across endpoints)
- [x] No invented endpoints, keys or usage stats

## 4.12 Admin Interface — `/admin`

Only backend-supported functionality; clarity and operational efficiency; no meaningless metrics.

**First priority when admin is built:** a moderation queue for user reports (4.5 lets users report discoveries and comments; nothing reviews them yet). Build it once the backend defines moderation endpoints.

- [ ] Submission management
- [ ] Analysis monitoring
- [ ] Discovery moderation
- [ ] Verification management
- [ ] User management
- [ ] Reward administration
- [ ] Reports
- [ ] Audit logs

---

## 4.13 Landing Page — `/`

Built last in Phase 4 so the hero can showcase real product components.

Notes:
- Built to the detailed landing brief ("Leonida After Dark"): floating glass nav with section scroll-spy, CSS-driven hero entrance (content shows without JS), scanner demo, interactive illustrative map, editorial discoveries grid, community verification walkthrough, Proof of Discovery, closing CTA, footer with the independence disclaimer.
- Imagery is **original artwork** drawn by `scripts/generate-landing-art.mjs` (no Rockstar or stock assets). Every slot and placeholder to replace before launch is listed in [docs/landing-assets.md](docs/landing-assets.md), including the footer pages that don't exist yet (About, Contact, Privacy, Terms, socials), which are left out rather than invented.
- No statistics or live-activity claims; all demo content is labelled "Illustration" or "Example".
- Verified in headless Chrome at 1440px and 390px: no horizontal overflow, no console errors, every link resolves, mobile menu, map controls and reduced motion all checked.

**Headline:** See Beyond the Scene.
**Supporting copy:** "Turn gameplay screenshots into intelligence. Identify what you see, uncover discoveries and explore the world through a community-powered visual network."

### Hero

- [x] Headline and supporting copy
- [x] Primary CTA: Explore the World → `/world`
- [x] Secondary CTA: Analyse a Screenshot → `/analyze`
- [x] Visual: dark cinematic background, product preview, discovery map, analysis panel, detection indicators, subtle scanner animation, contextual labels (no robots or brains)

### Sections

- [x] 1. Hero
- [x] 2. How Sixth Sense works
- [x] 3. Visual intelligence capabilities
- [x] 4. Interactive world discovery preview
- [x] 5. Community-powered verification
- [x] 6. Proof of Discovery and Web3 capabilities
- [x] 7. Developer ecosystem
- [x] 8. Final CTA
- [x] 9. Footer

### Motion

- [x] Cinematic hero entrance
- [x] Subtle scanner movement
- [x] Product preview transitions
- [x] Scroll reveals where appropriate

---

# PHASE 5 — Backend Integration

**Goal:** Connect the real APIs. The backend is the source of truth.
**⛔ Blocked** until an OpenAPI spec (or equivalent) and a reachable dev/staging URL are available.

## 5.1 API architecture

- [ ] Central API client in `lib/api/`
- [ ] Base URL from environment variables (no hardcoded production URLs)
- [ ] Authentication handling
- [ ] Consistent error handling
- [ ] Request cancellation where appropriate
- [ ] Typed requests/responses (generated from OpenAPI if available)
- [ ] TanStack Query for server state; no server data in Zustand

## 5.2 Missing endpoints

- [ ] Missing capabilities documented with the dependent frontend feature
- [ ] Typed interfaces only where the contract is established
- [ ] Dev mocks isolated and clearly labelled
- [ ] Confirmed no mock data is shown as production data

## 5.3 End-to-end validation

- [ ] Authentication
- [ ] Upload
- [ ] Analysis processing (real async states)
- [ ] Entity results
- [ ] Location results
- [ ] Discovery retrieval
- [ ] Verification
- [ ] Community interactions
- [ ] Wallet integration
- [ ] Rewards

---

# PHASE 6 — Production Readiness

**Goal:** Ship-quality frontend. Don't declare it production-ready until the important user journeys work end to end.

## 6.1 Responsive design

- [ ] Desktop: space used well; World Explorer spacious and immersive
- [ ] Tablet: panels and navigation reorganised, not shrunk
- [ ] Mobile: submission, browsing, location exploration, analysis results and community all work well
- [x] Touch-friendly buttons, filters and overlays

## 6.2 Accessibility

- [x] Semantic HTML
- [x] Keyboard navigation
- [x] Visible focus states
- [x] Labelled forms
- [x] Correct ARIA
- [x] Sufficient contrast
- [x] Screen-reader status updates
- [x] Reduced motion respected
- [x] Accessible modals and drawers
- [x] Verification/confidence never conveyed by colour alone

## 6.3 Performance

- [x] Optimised images
- [x] Lazy loading
- [x] Route-level code splitting
- [ ] No unnecessary re-renders
- [x] No large unnecessary dependencies
- [x] Optimised map rendering
- [ ] Paginated data (no full dataset loads)
- [x] Graceful API failures
- [x] No layout shift
- [x] Subscriptions and listeners cleaned up; no memory leaks

## 6.4 Security

- [x] Config via environment variables
- [x] No secrets in client code
- [x] No seed phrase / private key requests

## 6.5 SEO and metadata

- [x] Page titles
- [x] Meta descriptions
- [x] Open Graph metadata
- [x] Social sharing previews
- [x] Canonical URLs
- [x] Favicon and app icons
- [x] Semantic content structure
- [x] `noindex` on authenticated platform pages

## 6.6 Testing

- [x] Component tests for important reusable UI
- [x] Form validation tests
- [ ] API integration tests where practical
- [x] Screenshot upload flow tests
- [x] Analysis state transition tests
- [x] Discovery interaction tests
- [x] Authentication flow tests
- [ ] Responsive layout checks
- [x] Production build validation
- [x] Failure states tested, not only success paths

## 6.7 Final checks

- [ ] Functional testing
- [x] Responsive testing
- [x] Accessibility checks
- [x] Performance checks
- [x] Security review
- [x] Error-state testing
- [x] Build validation
- [x] Deployment configuration review

---

# Definition of Done

- [x] Sixth Sense brand consistently implemented
- [x] Final logo approved and in place
- [x] Landing page clearly communicates the product
- [x] World Explorer provides a usable interactive map experience
- [ ] Users can submit screenshots
- [ ] Analysis interface reflects real processing states
- [x] Multiple detected entities can be presented
- [x] Confidence and verification states are distinguishable
- [ ] Users can browse and inspect discoveries
- [ ] Community interactions work where supported
- [ ] Profiles and reputation are connected to actual data
- [ ] Web3 functionality is optional and correctly integrated
- [x] Developer documentation is accessible
- [x] All major pages are responsive
- [x] Loading, empty and error states implemented
- [x] Important interactions are functional
- [x] No critical TypeScript or production build errors
- [x] Relevant tests pass
