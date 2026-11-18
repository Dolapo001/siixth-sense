import type { Contributor } from "@/features/discoveries/types";
import type { VerificationStatus } from "@/types/intelligence";

/*
 * Web3 identity, attestation and reward types. Frontend shape only until the
 * backend contract exists.
 */

/** A wallet linked to the Sixth Sense account. `verified` only after a signature was checked. */
export type LinkedWallet = { address: string; network: string; verified: boolean; linkedAt: string };

/** A one-time message the wallet signs to prove ownership. Never a transaction. */
export type WalletChallenge = { message: string; nonce: string; expiresAt: string };

export type Attestation = {
  id: string;
  discoveryId: string;
  discoveryTitle: string;
  contributor: Contributor;
  /** The contributor's linked wallet at the time, if any. */
  contributorWallet: string | null;
  signature: string;
  network: string;
  /** Community status of the discovery when Sixth Sense recorded it. */
  status: VerificationStatus;
  recordedAt: string;
  explorerUrl: string;
};

export type WalletTransaction = {
  id: string;
  kind: "attestation" | "reward";
  description: string;
  signature: string;
  explorerUrl: string;
  at: string;
};

export type RewardActivityStatus = "eligible" | "pending_payout" | "paid" | "not_eligible";

export type RewardActivity = {
  discoveryId: string;
  discoveryTitle: string;
  status: RewardActivityStatus;
  /** Why it isn't eligible, when it isn't. */
  reason?: string;
  amount?: number;
};

export type RewardPayout = {
  id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  at: string;
  transaction: { signature: string; explorerUrl: string; network: string } | null;
};

export type Rewards = {
  /** Name of what's paid out, as defined by the backend. */
  unit: string;
  summary: { pending: number; completed: number };
  requirements: string[];
  activity: RewardActivity[];
  history: RewardPayout[];
};
