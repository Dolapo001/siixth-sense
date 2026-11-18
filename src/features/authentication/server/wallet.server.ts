import bs58 from "bs58";

/** A Solana address is a base58-encoded 32-byte ed25519 public key. Checked before bothering the backend. */
export function isSolanaAddress(address: unknown): address is string {
  if (typeof address !== "string" || address.length < 32 || address.length > 44) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}
