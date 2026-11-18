# Sixth Sense — Community Vote Threshold Spec

**Date:** 2026-11-18
**Audience:** backend team
**Status:** Implemented in the backend (2026-11-18), with two refinements marked *Implemented as* below. Code: `apps/community/services.py` (`review_refusal`, `tally`, `evaluate`, `progress`), settings in `config/settings.py`, tests in `apps/tests/test_vote_policy.py`.
**Context:** the frontend admin page was dropped (ROADMAP 4.12). Discoveries are verified by community votes alone, and the small amount of moderation left happens in Django admin.

---

## 1. What exists today

| Piece | Where | Behaviour |
|---|---|---|
| Vote endpoint | `contract/discovery_views.py` `VoteView` | `{vote: confirm \| dispute, reason}`. `dispute` is stored as decision `reject`. Reason required, one vote per reviewer, no changes or withdrawals, no voting on your own discovery |
| Who may vote | `community/services.py` `can_review` | Role `contributor`, `moderator` or `administrator` only |
| Threshold | `community/services.py` `evaluate` | Verified at `VERIFY_CONFIRMATIONS_REQUIRED` (3) confirms **and zero negatives**. Rejected at `VERIFY_REJECTIONS_REQUIRED` (3) negatives and zero confirms. Any conflict past a threshold → `disputed` |
| Collusion cap | `_effective_confirms` | One reviewer's confirms on one owner's discoveries count up to `COLLUSION_MAX_CONFIRMS_PER_OWNER` (3). Confirms only |
| Promotion | `reputation/services.py` `maybe_promote` | Player → contributor at reputation ≥ 20, account ≥ 7 days **and `email_verified`** |
| Reputation | `reputation/services.py` | Points come only from outcomes: `discovery_verified` +10, `accurate_review` +2, etc. |

## 2. Problems

1. **Deadlock: no one can vote.** All frontend accounts are wallet-only (no email), so `maybe_promote` never promotes them, and only contributors can vote. Reputation only comes from verified or rejected outcomes, and those need votes. With no contributors, nothing is ever verified.
2. **One negative vote blocks verification.** After 3 confirms, a single `reject` sends the discovery to `disputed`, and a moderator has to step in. One troll can push every discovery into the moderator queue.
3. **The collusion cap only covers confirms.** A friend ring can't verify each other's work, but it can still mass-reject a rival's.
4. **Moderators have no UI.** `disputed` discoveries and reports need a moderator, but `Discovery`, `Dispute`, `Report` and `Verification` aren't registered in Django admin, and the frontend admin page is gone.

## 3. Policy

### 3.1 Who can vote

Any signed-in account that:

- is at least `VOTE_MIN_ACCOUNT_AGE_DAYS` (default **3**) days old, *if it is a player* (*Implemented as:* contributors and up skip the age check, because they earned or were given their role),
- doesn't own the discovery,
- hasn't voted on it already.

Players can now vote. Their votes count for less (§3.2). This ends the deadlock: accurate votes earn `accurate_review` (+2) under the current rules, so active players reach contributor through voting.

**Promotion change:** in `maybe_promote`, replace `user.email_verified` with "has a verified email **or** a linked wallet". Signing in with a wallet counts as a linked wallet. Reputation and account-age rules stay as they are.

### 3.2 Vote weight

Each vote gets a weight from the voter's role **when the vote is cast**. Store it on the vote (see §5) so a later promotion doesn't change past results.

| Voter role | Weight | Setting |
|---|---|---|
| Player | **0.5** | `VOTE_WEIGHT_PLAYER` |
| Contributor | **1.0** | `VOTE_WEIGHT_CONTRIBUTOR` |
| Moderator / administrator | **1.0** | same as contributor; moderators resolve disputes through §3.5, not through bigger votes |

**Collusion cap (extended):** a vote counts with weight **0** when its voter has already cast `COLLUSION_MAX_VOTES_PER_OWNER` (default **3**) earlier votes **in the same direction** on the same owner's discoveries. This applies to confirms and disputes. Capped votes are still saved and shown as evidence; they just don't move the status.

### 3.3 Thresholds

Only `under_review` discoveries are evaluated. The first vote moves `submitted` → `under_review`, as it does now. After each vote:

```
C = sum of weights of counted confirm votes
D = sum of weights of counted negative votes (reject, duplicate)
T = number of counted votes (weight > 0) from contributor+ voters, on the winning side
agreement(side) = side / (C + D)
```

| Outcome | Condition (all must hold) |
|---|---|
| **verified** | `C ≥ VERIFY_WEIGHT_REQUIRED` (**5.0**), `agreement(C) ≥ VERIFY_MIN_AGREEMENT` (**0.8**), `T ≥ VERIFY_MIN_TRUSTED_VOTES` (**1**) |
| **rejected** | `D ≥ REJECT_WEIGHT_REQUIRED` (**5.0**), `agreement(D) ≥ VERIFY_MIN_AGREEMENT` (**0.8**), `T ≥ VERIFY_MIN_TRUSTED_VOTES` (**1**) |
| **disputed** | `C + D ≥ DISPUTE_WEIGHT_TRIGGER` (**8.0**) and **neither side reaches** `VERIFY_MIN_AGREEMENT` (*Implemented as:* a genuine split only; a unanimous vote that is only missing a trusted voter keeps waiting instead of going to a moderator) |
| stays **under_review** | otherwise |

In plain words: a discovery is verified once it has 5 points of confirmations (for example 10 players, or 5 contributors, or 2 contributors and 6 players), at least one of them is a contributor, and at least 80% of the vote weight agrees. A lone dissenter no longer blocks it.

`insufficient` and `alternative` decisions (internal API only; the frontend can't send them) count toward neither side.

**Why at least one trusted vote:** wallets cost nothing, so ten throwaway accounts that are 3 days old could otherwise verify anything. Requiring one contributor ties every outcome to someone with a track record.

### 3.4 Worked examples (defaults)

| Votes | C | D | Result |
|---|---|---|---|
| 5 contributors confirm | 5.0 | 0 | verified |
| 10 players confirm, no contributors | 5.0 | 0 | under_review (no trusted vote) |
| 16 players confirm, no contributors | 8.0 | 0 | under_review (unanimous, so not disputed) |
| 9 players + 1 contributor confirm | 5.5 | 0 | verified |
| 5 contributors confirm, 1 player disputes | 5.0 | 0.5 | verified (91%) |
| 5 contributors confirm, 2 contributors dispute | 5.0 | 2.0 | under_review (71%; total 7 < 8) |
| 5 confirm, 3 dispute (all contributors) | 5.0 | 3.0 | disputed (63%, total 8) |
| 5 contributors dispute | 0 | 5.0 | rejected |

### 3.5 Launch and moderation

- **Bootstrap:** at launch, administrators promote a few trusted community members with the **Set role: Verified Contributor** action on Users in Django admin (audited; `role` is read-only on the form). After that, promotion is automatic.
- **Admin access:** Django admin needs `is_staff`, and the moderation actions also need a `moderator` or `administrator` **role**. A superuser whose role is still `player` gets an error.
- **Disputed discoveries:** resolved by a moderator through the existing `disputes/{id}/resolve` service (`uphold` → verified, `overturn` → rejected).
- **Django admin (required by this spec):** register `Discovery`, `Verification`, `Dispute` and `Report`. Status changes must go through **admin actions that call the existing services** (`dsvc.transition`, `resolve_dispute`, report resolution). Don't edit `status` directly, because that skips the audit log, notifications and reputation. Make `status` read-only on the change form.
- Verified discoveries can still be challenged through the existing `open_dispute` flow. No change there.

## 4. Settings

All are environment-configurable, as now (FRD 12.5).

| Setting | Default | Status |
|---|---|---|
| `VERIFY_WEIGHT_REQUIRED` | 5.0 | new; replaces `VERIFY_CONFIRMATIONS_REQUIRED` |
| `REJECT_WEIGHT_REQUIRED` | 5.0 | new; replaces `VERIFY_REJECTIONS_REQUIRED` |
| `VERIFY_MIN_AGREEMENT` | 0.8 | new |
| `VERIFY_MIN_TRUSTED_VOTES` | 1 | new |
| `DISPUTE_WEIGHT_TRIGGER` | 8.0 | new |
| `VOTE_WEIGHT_PLAYER` | 0.5 | new |
| `VOTE_WEIGHT_CONTRIBUTOR` | 1.0 | new |
| `VOTE_MIN_ACCOUNT_AGE_DAYS` | 3 | new |
| `COLLUSION_MAX_VOTES_PER_OWNER` | 3 | renamed from `COLLUSION_MAX_CONFIRMS_PER_OWNER`; now covers both directions |
| `CONTRIBUTOR_MIN_REPUTATION`, `CONTRIBUTOR_MIN_ACCOUNT_AGE_DAYS` | 20, 7 | unchanged |

Remove the old names rather than reinterpreting them, so an old `.env` fails loudly instead of quietly changing meaning. Keep `DISPUTE_WEIGHT_TRIGGER ≥ VERIFY_WEIGHT_REQUIRED`; check this at startup.

**Vote throttle:** add a DRF throttle on the vote endpoint (suggested 30/hour per user) to slow down bulk voting from fresh accounts.

## 5. Data changes

- `Verification.weight`: `DecimalField(max_digits=3, decimal_places=2)`, set at creation from §3.2. Backfill existing rows with 1.0 (all current voters are contributors or higher).
- `Verification.voter_role`: role snapshot at creation, for the `T` count and the audit trail.
- The collusion cap is computed in `evaluate` at evaluation time, not stored, as it is now. Replace the per-vote `count()` loop in `_effective_confirms` with one grouped query.

## 6. API changes

**`viewer.vote` on discovery detail** (`vote_state`):
- Players are now allowed to vote. Remove the "Only Verified Contributors can vote" refusal.
- New refusal: `"Your account can vote {N} days after it was created."` while the account is younger than `VOTE_MIN_ACCOUNT_AGE_DAYS`. Return it with **403**, like the other eligibility refusals.

**Progress on detail** (frontend can show "3.5 of 5"). The backend sends it in snake_case, like the rest of the detail payload:
```ts
verification_progress: {
  confirm_weight: number; dispute_weight: number;
  required: number; min_agreement: number;
  trusted_votes: number; trusted_required: number;
} | null   // null once voting has closed
```

**Status event notes** (`VerificationEvent.note`, shown on the discovery timeline): use readable text, for example `"Verified: 5.5 weighted confirmations from 10 reviewers, 100% agreement"` and `"Disputed: reviewers split 63% / 37%, sent to a moderator"`.

The vote request and response shapes are unchanged.

## 7. Tests to add

- Every row of the §3.4 table.
- A wallet-only player reaches contributor through accurate votes (no email).
- A player younger than 3 days gets refused, with the right message.
- The collusion cap in the dispute direction: the 4th dispute against the same owner counts 0.
- A vote's weight doesn't change after the voter is promoted.
- An old `VERIFY_CONFIRMATIONS_REQUIRED` env var fails startup.
- Django admin actions write a `StatusEvent` and an audit record. The `status` field is read-only.

## 8. Out of scope

- Time-based expiry for discoveries that stay `under_review` for a long time.
- Reputation-scaled weights beyond the two role tiers.
- A frontend moderation UI.
