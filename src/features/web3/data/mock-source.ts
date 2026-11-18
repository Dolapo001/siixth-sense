/*
 * ⚠ DEVELOPMENT SAMPLE SERVICE — devnet only, nothing is sent on-chain.
 *
 * Wallet linking does a real check: the wallet signs a one-time message and
 * this mock verifies the Ed25519 signature with WebCrypto, as the backend
 * will. Attestations and rewards are sample data, labelled in the UI.
 */

import bs58 from "bs58";
import { getSession } from "@/features/authentication/session";
import { getSampleCommunitySnapshot, sampleAttestationFor } from "@/features/discoveries/data/mock-source";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { Attestation, LinkedWallet, RewardActivity, RewardPayout, Rewards } from "../types";
import type { Web3DataSource } from "./source";

const CHALLENGE_TTL_MS = 5 * 60_000;
const PAGE_SIZE = 12;
const EXPLORER = "https://explorer.solana.com/?cluster=devnet";

let linked: LinkedWallet | null = null;
const challenges = new Map<string, { address: string; expiresAt: number }>();

/** Read by the profiles mock so the viewer's profile shows their linked wallet. */
export function getSampleLinkedWallet() {
  return linked;
}

/** Checks an Ed25519 signature by a Solana address (base58 public key). */
export async function verifySolanaSignature(address: string, message: string, signature: string) {
  let publicKey: Uint8Array;
  let sig: Uint8Array;
  try {
    publicKey = bs58.decode(address);
    sig = bs58.decode(signature);
  } catch {
    return false;
  }
  if (publicKey.length !== 32 || sig.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey("raw", publicKey as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sig as BufferSource, new TextEncoder().encode(message));
  } catch {
    throw new ActionRefusedError("This browser can't check wallet signatures. Try an up-to-date browser.");
  }
}

function challengeMessage(username: string, address: string, nonce: string, issuedAt: string) {
  return [
    `Sixth Sense wants you to link this wallet to @${username}.`,
    "",
    "Signing proves you own the wallet. It is not a transaction and costs nothing.",
    "",
    `Wallet: ${address}`,
    "Network: Solana devnet",
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}

async function requireViewer() {
  const session = await getSession();
  if (!session) throw new ActionRefusedError("Sign in to do that.");
  return session.user;
}

function sampleWalletFor(username: string) {
  // Clearly fake, for display only.
  return `Sample${username.replace(/[^a-z0-9]/gi, "")}Wa11et`;
}

function allAttestations(): Attestation[] {
  const { items } = getSampleCommunitySnapshot();
  return items
    .flatMap(({ item, history }) => {
      const attestation = sampleAttestationFor(item, history);
      if (!attestation) return [];
      return [
        {
          id: `att-${item.id}`,
          discoveryId: item.id,
          discoveryTitle: item.title,
          contributor: item.contributor,
          contributorWallet:
            item.contributor.username === "sample_viewer"
              ? (linked?.address ?? null)
              : sampleWalletFor(item.contributor.username),
          signature: attestation.signature,
          network: attestation.network,
          status: item.verification,
          recordedAt: attestation.recordedAt,
          explorerUrl: attestation.explorerUrl,
        },
      ];
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

const REWARD_PER_VERIFIED = 25;

function rewardsFor(username: string): Rewards {
  const { items } = getSampleCommunitySnapshot();
  const mine = items.filter(({ item }) => item.contributor.username === username);
  const activity: RewardActivity[] = [];
  const history: RewardPayout[] = [];

  mine.forEach(({ item, history: events }, index) => {
    const base = { discoveryId: item.id, discoveryTitle: item.title };
    switch (item.verification) {
      case "verified": {
        // Payouts need a linked, verified wallet. With one, alternate paid and pending so both show.
        const paid = !!linked?.verified && index % 2 === 0;
        activity.push({
          ...base,
          status: paid ? "paid" : "pending_payout",
          amount: REWARD_PER_VERIFIED,
          reason: linked?.verified ? undefined : "Paid once you link a verified wallet.",
        });
        history.push({
          id: `payout-${item.id}`,
          amount: REWARD_PER_VERIFIED,
          status: paid ? "completed" : "pending",
          at: events.at(-1)!.at,
          transaction: paid
            ? { signature: `SAMPLEPAYOUT${index}SIGNATURE`, explorerUrl: EXPLORER, network: "Solana devnet (sample)" }
            : null,
        });
        break;
      }
      case "ai_suggested":
      case "awaiting_verification":
        activity.push({ ...base, status: "not_eligible", reason: "Waiting for community verification." });
        break;
      case "disputed":
        activity.push({ ...base, status: "not_eligible", reason: "Disputed. Eligible again if reviewers verify it." });
        break;
      case "rejected":
        activity.push({ ...base, status: "not_eligible", reason: "Rejected by reviewers." });
        break;
    }
  });

  const sum = (status: RewardPayout["status"]) =>
    history.filter((p) => p.status === status).reduce((total, p) => total + p.amount, 0);

  return {
    unit: "sample points",
    summary: { pending: sum("pending"), completed: sum("completed") },
    requirements: [
      "The discovery must be verified by community reviewers. Uploading alone never earns rewards.",
      "Disputed or rejected discoveries aren't eligible.",
      "Payouts go to a linked, verified wallet. Without one, rewards wait until you link one.",
    ],
    activity,
    history: history.sort((a, b) => b.at.localeCompare(a.at)),
  };
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockWeb3Source(now: () => number = Date.now): Web3DataSource {
  return {
    kind: "sample",
    network: { name: "Solana devnet", cluster: "devnet" },

    async getLinkedWallet() {
      await delay();
      return (await getSession()) ? linked : null;
    },

    async createChallenge(address) {
      const viewer = await requireViewer();
      const nonce = crypto.randomUUID();
      const issuedAt = new Date(now()).toISOString();
      challenges.set(nonce, { address, expiresAt: now() + CHALLENGE_TTL_MS });
      return {
        nonce,
        message: challengeMessage(viewer.username, address, nonce, issuedAt),
        expiresAt: new Date(now() + CHALLENGE_TTL_MS).toISOString(),
      };
    },

    async linkWallet(address, challenge, signature) {
      await requireViewer();
      const issued = challenges.get(challenge.nonce);
      // One use only, whatever happens.
      challenges.delete(challenge.nonce);
      if (!issued || issued.address !== address) throw new ActionRefusedError("That request isn't valid. Start again.");
      if (now() > issued.expiresAt) throw new ActionRefusedError("That request expired. Start again.");
      if (!(await verifySolanaSignature(address, challenge.message, signature))) {
        throw new ActionRefusedError("The signature didn't match this wallet, so it wasn't linked.");
      }
      linked = { address, network: "Solana devnet", verified: true, linkedAt: new Date(now()).toISOString() };
      return linked;
    },

    async unlinkWallet() {
      await requireViewer();
      await delay();
      linked = null;
    },

    async listWalletTransactions() {
      const viewer = await requireViewer();
      if (!linked) return [];
      const attestations = allAttestations()
        .filter((a) => a.contributor.username === viewer.username)
        .map((a) => ({
          id: a.id,
          kind: "attestation" as const,
          description: `Attestation for ${a.discoveryTitle}`,
          signature: a.signature,
          explorerUrl: a.explorerUrl,
          at: a.recordedAt,
        }));
      const payouts = rewardsFor(viewer.username).history.flatMap((p) =>
        p.transaction
          ? [
              {
                id: p.id,
                kind: "reward" as const,
                description: `Reward payout, ${p.amount} sample points`,
                signature: p.transaction.signature,
                explorerUrl: p.transaction.explorerUrl,
                at: p.at,
              },
            ]
          : [],
      );
      return [...attestations, ...payouts].sort((a, b) => b.at.localeCompare(a.at));
    },

    async listAttestations(page) {
      await delay();
      const all = allAttestations();
      const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
      const current = Math.min(Math.max(1, page), totalPages);
      return {
        items: all.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
        total: all.length,
        page: current,
        pageSize: PAGE_SIZE,
      };
    },

    async getRewards() {
      const session = await getSession();
      if (!session) return null;
      await delay();
      return rewardsFor(session.user.username);
    },
  };
}
