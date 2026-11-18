import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { Page } from "@/features/discoveries/types";
import type { Attestation, LinkedWallet, Rewards, WalletChallenge, WalletTransaction } from "../types";

/**
 * Wallet linking, attestations and rewards. Wallet ownership is proven by
 * signing a one-time message; the server checks the signature. The UI never
 * marks a wallet verified on its own.
 */
export interface Web3DataSource {
  readonly kind: "sample" | "live";
  /** Only this network is used. */
  readonly network: { name: string; cluster: "devnet" | "mainnet-beta" };

  getLinkedWallet(): Promise<LinkedWallet | null>;
  createChallenge(address: string): Promise<WalletChallenge>;
  /** Server checks `signature` (base58) over `challenge.message` for `address`. */
  linkWallet(address: string, challenge: WalletChallenge, signature: string): Promise<LinkedWallet>;
  unlinkWallet(): Promise<void>;
  listWalletTransactions(): Promise<WalletTransaction[]>;

  listAttestations(page: number): Promise<Page<Attestation>>;

  /** Null when signed out. */
  getRewards(): Promise<Rewards | null>;
}

export async function getWeb3DataSource(): Promise<Web3DataSource | null> {
  if (liveApiEnabled()) {
    const { createApiWeb3Source } = await import("./api-source");
    return createApiWeb3Source();
  }
  if (devMocksEnabled()) {
    const { createMockWeb3Source } = await import("./mock-source");
    return createMockWeb3Source();
  }
  return null;
}
