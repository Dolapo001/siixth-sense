/*
 * Wallet linking, attestations and rewards from the Sixth Sense backend
 * (items 26–33 of its docs/frontend-requirements-response.md). The backend
 * keeps each challenge message and checks the signature itself.
 */

import { api, ApiError, type ApiPage } from "@/lib/api/client";
import { toContributor, toPage, toVerification } from "@/lib/api/mappers";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { Attestation, LinkedWallet, Rewards, WalletTransaction } from "../types";
import type { Web3DataSource } from "./source";

type BackendAttestation = {
  id: string;
  discovery: string;
  discovery_title: string;
  contributor: string | { username: string; display_name?: string } | null;
  contributor_wallet: string | null;
  signature: string;
  network: string;
  status: string;
  recorded_at: string;
  explorer_url: string;
};

type BackendRewards = {
  unit: string;
  summary: Rewards["summary"];
  requirements: string[];
  activity: { discovery: string; discovery_title: string; status: Rewards["activity"][number]["status"]; amount: number | null; reason: string | null }[];
  history: {
    id: string;
    amount: number;
    status: Rewards["history"][number]["status"];
    at: string;
    transaction: { signature: string; explorer_url: string; network: string } | null;
  }[];
};

const signedOut = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

/** Refusals (wrong wallet, already linked, expired challenge…) carry a player-safe message. */
async function action<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) throw new ActionRefusedError(error.message);
    throw error;
  }
}

export async function createApiWeb3Source(): Promise<Web3DataSource> {
  const config = await api<{ network: { name: string; cluster: "devnet" | "mainnet-beta" } }>("web3/config/");
  const toWallet = (wallet: { address: string; verified_at: string }): LinkedWallet => ({
    address: wallet.address,
    network: config.network.name,
    // The backend only stores a wallet after checking its signature.
    verified: true,
    linkedAt: wallet.verified_at,
  });

  return {
    kind: "live",
    network: config.network,

    async getLinkedWallet() {
      try {
        const { wallet } = await api<{ wallet: { address: string; verified_at: string } | null }>("web3/wallet/me/");
        return wallet ? toWallet(wallet) : null;
      } catch (error) {
        if (signedOut(error) || (error instanceof ApiError && error.status === 404)) return null;
        throw error;
      }
    },

    createChallenge: (address) =>
      action(async () => {
        const c = await api<{ nonce: string; message: string; expires_at: string }>("web3/wallet/challenge/", {
          method: "POST",
          body: { address },
        });
        return { nonce: c.nonce, message: c.message, expiresAt: c.expires_at };
      }),

    linkWallet: (_address, challenge, signature) =>
      action(async () =>
        toWallet(
          await api<{ address: string; verified_at: string }>("web3/wallet/verify/", {
            method: "POST",
            body: { nonce: challenge.nonce, signature },
          }),
        ),
      ),

    unlinkWallet: () => action(() => api<void>("web3/wallet/disconnect/", { method: "DELETE" })),

    async listWalletTransactions() {
      try {
        const items = await api<{ id: string; kind: WalletTransaction["kind"]; description: string; signature: string; explorer_url: string; at: string }[]>(
          "web3/wallet/transactions/",
        );
        return items.map((t) => ({ id: t.id, kind: t.kind, description: t.description, signature: t.signature, explorerUrl: t.explorer_url, at: t.at }));
      } catch (error) {
        if (signedOut(error)) return [];
        throw error;
      }
    },

    async listAttestations(page) {
      const result = await api<ApiPage<BackendAttestation>>("attestations/public/", { query: { page } });
      return toPage(
        result,
        (a): Attestation => ({
          id: a.id,
          discoveryId: a.discovery,
          discoveryTitle: a.discovery_title,
          contributor: toContributor(a.contributor),
          contributorWallet: a.contributor_wallet,
          signature: a.signature,
          network: a.network,
          status: toVerification(a.status),
          recordedAt: a.recorded_at,
          explorerUrl: a.explorer_url,
        }),
      );
    },

    async getRewards() {
      try {
        const r = await api<BackendRewards>("rewards/me/");
        return {
          unit: r.unit,
          summary: r.summary,
          requirements: r.requirements,
          activity: r.activity.map((a) => ({
            discoveryId: a.discovery,
            discoveryTitle: a.discovery_title,
            status: a.status,
            reason: a.reason ?? undefined,
            amount: a.amount ?? undefined,
          })),
          history: r.history.map((h) => ({
            id: h.id,
            amount: h.amount,
            status: h.status,
            at: h.at,
            transaction: h.transaction && {
              signature: h.transaction.signature,
              explorerUrl: h.transaction.explorer_url,
              network: h.transaction.network,
            },
          })),
        };
      } catch (error) {
        if (signedOut(error)) return null;
        throw error;
      }
    },
  };
}
