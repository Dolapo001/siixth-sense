/*
 * Wallet types and helpers with no Solana imports, so pages that only read
 * Web3 data (rewards, proof) don't download the wallet adapter.
 */

/** What the Web3 UI needs from a wallet. Components take this, so they're testable without a wallet. */
export type WalletControls = {
  available: { name: string; icon: string }[];
  connected: boolean;
  connecting: boolean;
  walletName: string | null;
  /** Base58 public key of the connected wallet. */
  address: string | null;
  connect: (name: string) => void;
  disconnect: () => Promise<void>;
  /** Null when the wallet can't sign messages. */
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
};

/** True when the user declined in their wallet, as opposed to a technical failure. */
export function isUserRejection(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /reject|declin|cancel|denied/i.test(text);
}
