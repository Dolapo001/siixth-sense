/*
 * Wallet sign-in, shared by the sign-in UI and the /api/auth routes. The
 * backend issues the one-time message the wallet signs and checks the
 * signature; signing costs nothing and sends no transaction.
 */

/** /api/auth/verify error code: the wallet has no account yet and the terms weren't accepted. */
export const TERMS_REQUIRED = "terms_required";
