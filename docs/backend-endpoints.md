# Sixth Sense — Backend Endpoints Needed by the Frontend

**Date:** 2026-11-17
**Audience:** backend team
**Status:** Proposal. Nothing here is agreed yet.

This document lists what the frontend needs from the Sixth Sense API. It is derived from the typed data-source interfaces the frontend already uses (`src/features/*/data/source.ts`) and the domain types next to them (`src/features/*/types.ts`). Today those interfaces are backed by labelled sample data. In Phase 5 each one gets an API-backed implementation.

**What's fixed and what isn't**

- **Fixed (from the frontend code):** which operations exist, their inputs, and the data each screen needs back.
- **Suggested only:** URL paths, HTTP methods and JSON field names. Change them freely. The frontend maps backend responses onto its own types in `lib/api/`, so names don't have to match. What matters is that the information is there.
- **Preferred:** an OpenAPI 3 document. The frontend can generate typed clients from it, and the Developer Portal (`/developers`) renders its API reference straight from it (`SIXTH_SENSE_OPENAPI_URL`).

---

## Contents

1. [Conventions](#1-conventions)
2. [Shared vocabularies](#2-shared-vocabularies)
3. [Authentication & session](#3-authentication--session)
4. [Screenshot analysis](#4-screenshot-analysis)
5. [World map](#5-world-map)
6. [Discoveries](#6-discoveries)
7. [Community actions](#7-community-actions)
8. [Profiles & leaderboard](#8-profiles--leaderboard)
9. [Web3: wallet, attestations, rewards](#9-web3-wallet-attestations-rewards)
10. [Notifications & settings](#10-notifications--settings)
11. [Admin / moderation](#11-admin--moderation)
12. [Developer portal](#12-developer-portal)
13. [Endpoint summary](#13-endpoint-summary)
14. [Open questions](#14-open-questions)

---

## 1. Conventions

### Base URL
The frontend reads the base URL from `NEXT_PUBLIC_API_BASE_URL`. A reachable dev or staging URL is needed for Phase 5.

### Timestamps
All timestamps are ISO 8601 strings in UTC (e.g. `2026-11-17T14:03:00Z`).

### Pagination
The frontend uses page numbers today:

```ts
type Page<T> = {
  items: T[];
  total: number;    // total matching items
  page: number;     // 1-based
  pageSize: number; // the discovery feed uses 12
};
```

Cursor pagination works too if the backend prefers it. Tell us before Phase 5, because the feed UI shows "page X of Y".

### Errors
The UI shows the server's reason when it refuses an action (e.g. "You can't vote on your own discovery"). So every 4xx needs a **human-readable message that is safe to show to users**:

```json
{
  "error": {
    "code": "vote_not_allowed",
    "message": "You can't vote on your own discovery."
  }
}
```

| Status | Frontend behaviour |
|---|---|
| 400 / 422 | Shows `message`. Forms keep the user's input. Per-field errors are welcome (`fields: { body: "Too long" }`). |
| 401 | Prompts the user to sign in |
| 403 | Shows the permission-denied state with `message` |
| 404 | Shows the "not found" state (detail endpoints may also return 404 instead of `null`) |
| 429 | Shows `message`. A `Retry-After` header is helpful. |
| 5xx | Shows a generic error with a retry button |

### Cancellation
List and detail reads may be aborted by the client when filters change. Nothing is needed server-side.

---

## 2. Shared vocabularies

Many responses use these enums. The UI depends on the **meaning** of each value. The backend can use other names, and we'll map them.

| Name | Values | Meaning |
|---|---|---|
| `VerificationStatus` | `ai_suggested`, `awaiting_verification`, `verified`, `disputed`, `rejected` | Trust state of a detection, location or discovery |
| `ConfidenceLevel` | `high`, `moderate`, `low` | Optional label next to a numeric confidence |
| `LocationPrecision` | `confirmed`, `approximate`, `region`, `unknown` | How exactly a location is known. Only `confirmed` and `approximate` items have coordinates. |
| `DiscoveryCategory` | `location`, `vehicle`, `character`, `wildlife`, `object`, `event`, `hidden` | Entity / discovery category |
| `confidence` | number `0–1` | Optional numeric score |

```ts
type Contributor = { username: string; displayName: string };
type WorldCoordinate = { x: number; y: number };                       // game-world units, not GPS
type WorldBounds = { minX: number; minY: number; maxX: number; maxY: number };
type Region = { id: string; name: string; bounds: WorldBounds };
```

**Product rule:** the UI never invents a confident match. If the backend has no match, return an empty list or `null`, not a low-quality guess flagged as confirmed.

---

## 3. Authentication & session

> **Not designed yet.** `src/features/authentication/session.ts` is a stub. The auth method (cookie session, JWT, OAuth provider, wallet sign-in) needs a decision first.

The frontend needs at least:

| Method | Suggested path | Purpose |
|---|---|---|
| `GET` | `/me` | Current session. `401` or `null` when signed out. |
| `POST` | `/auth/login` | Sign in (if not using an external provider) |
| `POST` | `/auth/register` | Create an account |
| `GET` | `/auth/callback` | OAuth/SSO return (the frontend route `/auth/callback` exists) |
| `POST` | `/auth/logout` | Sign out |

```ts
// GET /me → 200
type Session = {
  user: Contributor & { avatarUrl?: string | null };
  // add roles here if admin access is role-based, e.g. roles: ["admin"]
};
```

If auth is cookie-based, cookies must work across the frontend and API origins (CORS with credentials, `SameSite` set correctly).

---

## 4. Screenshot analysis

Source: `src/features/image-analysis/data/source.ts`, `types.ts`

Flow: upload a screenshot → get a job ID → poll the job until it is `completed` or `failed`. **The UI never decides a job's status itself.** It shows whatever the job endpoint reports.

### 4.1 Upload constraints
`GET /analyses/constraints` (or put it in a general `/config` endpoint)

```json
{
  "maxBytes": 20971520,
  "acceptedTypes": ["image/png", "image/jpeg", "image/webp"],
  "pollIntervalMs": 1000
}
```
The frontend validates files before uploading using these values. The sample data currently assumes 20 MB with PNG, JPEG or WebP.

### 4.2 Upload a screenshot
`POST /analyses`, `multipart/form-data`, field `file`

→ `202 Accepted`
```json
{ "jobId": "job_123" }
```
- Images only; video is out of scope.
- The frontend uses XMLHttpRequest to show upload progress. Plain multipart is fine; no chunking is needed unless the backend wants it.
- Reject bad files with `400` or `415` and a user-facing `message`.

### 4.3 Get job status and results
`GET /analyses/{jobId}`

```ts
type AnalysisJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  submittedAt: string;
  completedAt?: string;
  error?: { code: string; message: string };   // when status = "failed"
  detections: Detection[];                       // meaningful when "completed"
  locationMatches: LocationMatch[];
};

type Detection = {
  id: string;
  label: string;                    // suggested identity, e.g. "Pegassi Zentorno"
  category: DiscoveryCategory;
  confidence?: number;              // 0–1
  confidenceLevel?: ConfidenceLevel;
  description?: string;
  verification: VerificationStatus;
  box: { x: number; y: number; width: number; height: number } | null;
                                    // relative 0–1, origin top-left; null if unknown
  evidence: string[];               // why the model thinks so
  relatedDiscoveries: { id: string; title: string }[];
  relatedLocations: { id: string; name: string; precision: LocationPrecision }[];
};

type LocationMatch = {
  locationId: string;
  name: string;
  precision: LocationPrecision;
  confidence?: number;
};
```

The frontend polls every `pollIntervalMs`. If the backend offers push (SSE or WebSocket), tell us and we'll switch.

**Also needed (no UI yet):** a way to turn a completed analysis into a public discovery, e.g. `POST /discoveries { analysisId, title?, description? }`. Without it, discoveries can only come from the backend side.

---

## 5. World map

Source: `src/features/world/data/source.ts`, `types.ts`

The map loads bounds, regions and markers together on first render.

| Method | Suggested path | Response |
|---|---|---|
| `GET` | `/world/bounds` | `WorldBounds` |
| `GET` | `/world/regions` | `Region[]` |
| `GET` | `/world/markers` | `WorldMarker[]` |
| `GET` | `/world/locations/{id}` | `LocationDetail` (404 if missing) |

These three could also be one `GET /world` returning `{ bounds, regions, markers }`.

```ts
type WorldMarker = {
  id: string;
  locationId: string;
  title: string;
  category: DiscoveryCategory;
  precision: LocationPrecision;
  coordinate: WorldCoordinate | null;   // null for region/unknown precision
  radius?: number;                      // uncertainty radius for "approximate"
  regionId: string | null;
  verification: VerificationStatus;
};

type LocationDetail = {
  id: string;
  name: string;
  regionId: string | null;
  description: string;
  precision: LocationPrecision;
  coordinate: WorldCoordinate | null;
  radius?: number;
  verification: VerificationStatus;
  discoveries: { id: string; title: string; category: DiscoveryCategory;
                 verification: VerificationStatus; submittedAt: string }[];
  relatedEntities: { id: string; name: string; category: DiscoveryCategory }[];
  activity: { discoveries: number; contributors: number; lastActivityAt: string | null };
  screenshots: { id: string; url: string; alt: string }[];
};
```

Notes:
- The frontend clusters markers on the client. Returning all markers is fine up to a few thousand. Beyond that, add `?bbox=minX,minY,maxX,maxY`.
- **Map base layer:** we need to know if there's a licensed or permitted map image or tiles, and where they're served from. Without one, the frontend shows a labelled fallback grid.

---

## 6. Discoveries

Source: `src/features/discoveries/data/source.ts`, `types.ts`, `query.ts`

### 6.1 List
`GET /discoveries`

| Query param | Type | Notes |
|---|---|---|
| `q` | string | Free-text search; empty = all |
| `categories` | `DiscoveryCategory[]` | Repeatable or comma-separated; empty = all |
| `regionId` | string | Optional |
| `verification` | `VerificationStatus` | Optional |
| `contributor` | username | Optional; used on profile pages |
| `sort` | `newest` \| `oldest` \| `discussed` \| `confirmed` | Default `newest` |
| `page` | number | 1-based |
| `pageSize` | number | Frontend uses 12 |

→ `Page<DiscoveryListItem>`

```ts
type DiscoveryListItem = {
  id: string;
  title: string;
  category: DiscoveryCategory;
  verification: VerificationStatus;
  submittedAt: string;
  contributor: Contributor;
  location: {
    locationId: string; name: string;
    regionId: string | null; regionName: string | null;
    precision: LocationPrecision;
  } | null;
  screenshot: { url: string; alt: string } | null;
  engagement: { comments: number; confirmations: number };
};
```

### 6.2 Detail
`GET /discoveries/{id}` → `DiscoveryDetail` (404 if missing)

```ts
type DiscoveryDetail = DiscoveryListItem & {
  description: string;
  detections: { id: string; label: string; category: DiscoveryCategory;
                confidence?: number; confidenceLevel?: ConfidenceLevel;
                verification: VerificationStatus }[];
  evidence: EvidenceItem[];
  suggestions: IdentificationSuggestion[];
  verificationHistory: VerificationEvent[];
  comments: DiscoveryComment[];
  related: DiscoveryListItem[];
  attestation: { network: string; signature: string;
                 explorerUrl: string; recordedAt: string } | null;
  viewer: ViewerPermissions | null;    // null when signed out
};

type EvidenceItem = { id: string; text: string; url?: string;
                      author: Contributor | null;  // null = from Sixth Sense analysis
                      at: string };
type IdentificationSuggestion = { id: string; author: Contributor; label: string;
                                  category: DiscoveryCategory; note?: string; at: string };
type VerificationEvent = { at: string; status: VerificationStatus;
                           actor: { kind: "ai" } | { kind: "member"; username: string };
                           note?: string };
type DiscoveryComment = { id: string; author: Contributor; body: string; at: string };
```

### 6.3 Viewer permissions (important)
**The server decides what the signed-in user may do. The UI never works out eligibility itself.** Include this on the detail response for the current user:

```ts
type ViewerPermissions = {
  canComment: boolean;
  canSuggest: boolean;
  canAddEvidence: boolean;
  canReport: boolean;
  vote: { allowed: boolean; reason?: string; current: "confirm" | "dispute" | null };
  followingContributor?: boolean;   // omit if following isn't supported
};
```
`vote.reason` is shown to the user when voting isn't allowed (e.g. "You can't vote on your own discovery").

### 6.4 Regions for the filter
`GET /regions` → `Region[]`. This can be the same as `/world/regions`.

---

## 7. Community actions

All require a signed-in user, and the server re-checks permissions on every request. On refusal, return 403 or 422 with a user-facing `message` (see §1).

| Method | Suggested path | Body | Response |
|---|---|---|---|
| `POST` | `/discoveries/{id}/comments` | `{ body: string }` | `DiscoveryComment` |
| `POST` | `/discoveries/{id}/suggestions` | `{ label, category, note? }` | `IdentificationSuggestion` |
| `POST` | `/discoveries/{id}/evidence` | `{ text, url? }` | `EvidenceItem` |
| `POST` | `/discoveries/{id}/votes` | `{ vote: "confirm" \| "dispute", reason? }` | **Updated `DiscoveryDetail`** |
| `POST` | `/reports` | `{ target: { kind: "discovery" \| "comment", id }, reason, details? }` | `{ reportId }` |
| `PUT` | `/users/{username}/follow` | — | `{ following: true }` |
| `DELETE` | `/users/{username}/follow` | — | `{ following: false }` |

- **Votes** return the full updated discovery because a vote can change its verification status, and **that change is the server's decision**.
- **Report reasons:** `spam`, `misleading`, `offensive`, `copyright`, `other`.
- Following is optional. If it isn't supported, omit `followingContributor` and the UI hides the button.
- Is changing or withdrawing a vote allowed? If yes, add `DELETE /discoveries/{id}/votes`.

---

## 8. Profiles & leaderboard

Source: `src/features/profiles/data/source.ts`, `types.ts`

### 8.1 Profile
`GET /users/{username}` → `Profile` (404 if missing)

```ts
type Profile = {
  username: string;
  displayName: string;
  bio: string | null;
  joinedAt: string;
  avatarUrl: string | null;
  reputation: number;
  stats: { submitted: number; verified: number; reviews: number; comments: number };
  achievements: { id: string; name: string; description: string; earnedAt: string }[];
  wallet: { address: string; network: string; verified: boolean } | null;
  regionsExplored: number;
};
```
A user's discoveries come from `GET /discoveries?contributor={username}`.

### 8.2 Leaderboard
`GET /leaderboard?dimension=verified|reviews|reputation&period=week|month|all`

```ts
type Leaderboard = {
  dimension: "verified" | "reviews" | "reputation";
  period: "week" | "month" | "all";
  entries: { rank: number; username: string; displayName: string;
             verified: number; reviews: number; reputation: number }[];
  supportedPeriods: ("week" | "month" | "all")[];  // UI hides periods you don't support
};
```

**Also needed (no UI yet):** `PATCH /me/profile` (displayName, bio, avatar) for Settings.

---

## 9. Web3: wallet, attestations, rewards

Source: `src/features/web3/data/source.ts`, `types.ts`

### 9.1 Network config
`GET /web3/config`
```json
{ "network": { "name": "Solana Devnet", "cluster": "devnet" } }
```
`cluster` is `devnet` or `mainnet-beta`. **Which one is still an open question.**

### 9.2 Wallet linking (signature, never a transaction)
The user proves wallet ownership by signing a one-time message.

| Method | Suggested path | Body | Response |
|---|---|---|---|
| `GET` | `/me/wallet` | — | `LinkedWallet \| null` |
| `POST` | `/me/wallet/challenge` | `{ address }` | `WalletChallenge` |
| `POST` | `/me/wallet` | `{ address, nonce, message, signature }` | `LinkedWallet` |
| `DELETE` | `/me/wallet` | — | `204` |

```ts
type WalletChallenge = { message: string; nonce: string; expiresAt: string };
type LinkedWallet = { address: string; network: string; verified: boolean; linkedAt: string };
```
- `signature` is the **base58-encoded** ed25519 signature of the UTF-8 bytes of `message`.
- The server must check that the nonce is single-use, unexpired and tied to this user and address.
- Return a user-facing `message` for failures (expired challenge, wallet already linked to another account, etc.).

### 9.3 Wallet transactions
`GET /me/wallet/transactions` → `WalletTransaction[]`
```ts
type WalletTransaction = { id: string; kind: "attestation" | "reward"; description: string;
                           signature: string; explorerUrl: string; at: string };
```

### 9.4 Attestations (Proof of Discovery)
`GET /attestations?page=` → `Page<Attestation>`
```ts
type Attestation = {
  id: string;
  discoveryId: string;
  discoveryTitle: string;
  contributor: Contributor;
  contributorWallet: string | null;
  signature: string;            // on-chain tx signature
  network: string;
  status: VerificationStatus;   // discovery's status when recorded
  recordedAt: string;
  explorerUrl: string;
};
```
An attestation records Sixth Sense's process on-chain. It is **not** proof that the discovery is correct, and the UI says so.

### 9.5 Rewards
`GET /me/rewards` → `Rewards` (401 when signed out)
```ts
type Rewards = {
  unit: string;                                   // what is paid, e.g. a token name
  summary: { pending: number; completed: number };
  requirements: string[];                         // plain-language eligibility rules
  activity: { discoveryId: string; discoveryTitle: string;
              status: "eligible" | "pending_payout" | "paid" | "not_eligible";
              reason?: string; amount?: number }[];
  history: { id: string; amount: number; status: "pending" | "completed" | "failed";
             at: string;
             transaction: { signature: string; explorerUrl: string; network: string } | null }[];
};
```
The frontend only displays rewards. It never triggers payouts.

---

## 10. Notifications & settings

The routes exist (`/notifications`, `/settings`) but show "unavailable" until these exist.

| Method | Suggested path | Purpose |
|---|---|---|
| `GET` | `/me/notifications?page=` | `Page<Notification>` |
| `POST` | `/me/notifications/read` | Mark read: `{ ids: string[] }` or `{ all: true }` |
| `GET` | `/me/notifications/unread-count` | Badge in the navigation |
| `GET` | `/me/settings` | Account and notification preferences |
| `PATCH` | `/me/settings` | Update preferences |
| `DELETE` | `/me` | Delete the account (if supported) |

Suggested shape (no frontend type yet):
```ts
type Notification = {
  id: string;
  kind: "comment" | "vote" | "verification_change" | "suggestion" | "reward" | "follow";
  message: string;
  discoveryId?: string;
  actor?: Contributor;
  at: string;
  read: boolean;
};
```

---

## 11. Admin / moderation

The admin area is paused. Its first feature will be a **moderation queue for reports** submitted through `POST /reports`.

| Method | Suggested path | Purpose |
|---|---|---|
| `GET` | `/admin/reports?status=open&page=` | Paginated report queue |
| `GET` | `/admin/reports/{id}` | Report with the reported content |
| `POST` | `/admin/reports/{id}/resolve` | `{ action: "dismiss" \| "remove_content" \| "warn_user", note? }` |

These need a role check, and `/me` should expose the role so the frontend can show the admin entry.

---

## 12. Developer portal

| What | Notes |
|---|---|
| OpenAPI 3 JSON document | Served at a URL the frontend fetches server-side (`SIXTH_SENSE_OPENAPI_URL`, cached hourly). Include request and response examples where possible. |
| API keys | Only if public API access is planned: `GET /me/api-keys`, `POST /me/api-keys` (returns the secret once), `DELETE /me/api-keys/{id}` |

---

## 13. Endpoint summary

| # | Method | Suggested path | Area | Auth | Frontend status |
|---|---|---|---|---|---|
| 1 | GET | `/me` | Auth | optional | UI ready (stub) |
| 2 | POST | `/auth/login` | Auth | — | Route ready |
| 3 | POST | `/auth/register` | Auth | — | Route ready |
| 4 | GET | `/auth/callback` | Auth | — | Route ready |
| 5 | POST | `/auth/logout` | Auth | ✓ | Needed |
| 6 | GET | `/analyses/constraints` | Analysis | — | UI ready |
| 7 | POST | `/analyses` | Analysis | ? | UI ready |
| 8 | GET | `/analyses/{jobId}` | Analysis | ? | UI ready |
| 9 | POST | `/discoveries` | Analysis → Discovery | ✓ | Needed, no UI yet |
| 10 | GET | `/world/bounds` | World | — | UI ready |
| 11 | GET | `/world/regions` | World | — | UI ready |
| 12 | GET | `/world/markers` | World | — | UI ready |
| 13 | GET | `/world/locations/{id}` | World | — | UI ready |
| 14 | GET | `/discoveries` | Discoveries | — | UI ready |
| 15 | GET | `/discoveries/{id}` | Discoveries | optional* | UI ready |
| 16 | GET | `/regions` | Discoveries | — | UI ready (may reuse #11) |
| 17 | POST | `/discoveries/{id}/comments` | Community | ✓ | UI ready |
| 18 | POST | `/discoveries/{id}/suggestions` | Community | ✓ | UI ready |
| 19 | POST | `/discoveries/{id}/evidence` | Community | ✓ | UI ready |
| 20 | POST | `/discoveries/{id}/votes` | Community | ✓ | UI ready |
| 21 | POST | `/reports` | Community | ✓ | UI ready |
| 22 | PUT / DELETE | `/users/{username}/follow` | Community | ✓ | UI ready (optional) |
| 23 | GET | `/users/{username}` | Profiles | — | UI ready |
| 24 | PATCH | `/me/profile` | Profiles | ✓ | Needed |
| 25 | GET | `/leaderboard` | Leaderboard | — | UI ready |
| 26 | GET | `/web3/config` | Web3 | — | UI ready |
| 27 | GET | `/me/wallet` | Web3 | ✓ | UI ready |
| 28 | POST | `/me/wallet/challenge` | Web3 | ✓ | UI ready |
| 29 | POST | `/me/wallet` | Web3 | ✓ | UI ready |
| 30 | DELETE | `/me/wallet` | Web3 | ✓ | UI ready |
| 31 | GET | `/me/wallet/transactions` | Web3 | ✓ | UI ready |
| 32 | GET | `/attestations` | Web3 | — | UI ready |
| 33 | GET | `/me/rewards` | Rewards | ✓ | UI ready |
| 34 | GET | `/me/notifications` | Notifications | ✓ | Needed |
| 35 | POST | `/me/notifications/read` | Notifications | ✓ | Needed |
| 36 | GET | `/me/notifications/unread-count` | Notifications | ✓ | Needed |
| 37 | GET / PATCH | `/me/settings` | Settings | ✓ | Needed |
| 38 | GET | `/admin/reports` | Admin | admin | Paused |
| 39 | GET | `/admin/reports/{id}` | Admin | admin | Paused |
| 40 | POST | `/admin/reports/{id}/resolve` | Admin | admin | Paused |
| 41 | GET | OpenAPI document | Developers | — | UI ready |
| 42 | GET / POST / DELETE | `/me/api-keys` | Developers | ✓ | Optional |

\* Works signed out. When signed in, it includes `viewer` permissions.

**UI ready** = the screen is built and runs on sample data; it only needs an API-backed data source.
**Needed** = the app needs it, but no typed interface exists yet.

---

## 14. Open questions

1. **Auth:** which method or provider? Cookie or bearer token? Is wallet sign-in planned?
2. **Analysis:** is anonymous upload allowed, or is sign-in required? What are the rate limits? Are results available by push (SSE or WebSocket), or only by polling?
3. **Analysis → discovery:** how does a completed analysis become a public discovery? Does the user choose, or is it automatic?
4. **Map:** is there a licensed or permitted base map, and in what format (tiles or a single image) and coordinate system?
5. **Screenshots:** where are images hosted (CDN domain needed for `next/image`)? Are thumbnails generated?
6. **Pagination:** page numbers (as now) or cursors?
7. **Votes:** can a user change or withdraw a vote? What thresholds move a discovery to `verified`, `disputed` or `rejected`?
8. **Solana:** devnet or mainnet-beta? Which attestation program? What is the reward unit?
9. **Roles:** how are admins and moderators identified?
10. **Public API:** are third-party API keys planned?
