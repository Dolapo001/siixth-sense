/** "AbCd…wXyZ": a Solana address short enough for UI, still recognisable. */
export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}
