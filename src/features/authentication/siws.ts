/*
 * Sign-In With Solana (SIWS): the plain-text message a wallet signs to prove
 * it owns an address. Signing it costs nothing and sends no transaction.
 * Shared by the server (which builds and later checks it) and tests.
 * Format follows the SIWS / CAIP-122 sign-in message.
 */

export const SESSION_COOKIE = "ss_session";
export const CHALLENGE_COOKIE = "ss_siws";

/** How long a sign-in challenge stays valid. */
export const CHALLENGE_TTL_SECONDS = 5 * 60;
/** How long a session lasts before signing in again. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SignInFields = {
  /** The site's host, e.g. "sixthsense.gg". Wallets show it so players can spot phishing. */
  domain: string;
  uri: string;
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  chainId: string;
};

export function signInMessage(f: SignInFields) {
  return [
    `${f.domain} wants you to sign in with your Solana account:`,
    f.address,
    "",
    "Sign in to Sixth Sense. This only proves you own this wallet: it won't send a transaction or cost anything.",
    "",
    `URI: ${f.uri}`,
    "Version: 1",
    `Chain ID: ${f.chainId}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${f.issuedAt}`,
    `Expiration Time: ${f.expirationTime}`,
  ].join("\n");
}
