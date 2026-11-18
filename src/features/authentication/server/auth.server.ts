/*
 * Server-only auth helpers: signed tokens for the session and challenge
 * cookies, and ed25519 checks of wallet signatures. Interim, in this app,
 * until the Sixth Sense backend owns accounts; the backend can verify the
 * same session token with the shared AUTH_SECRET.
 */

import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import bs58 from "bs58";
import { shortAddress } from "@/lib/utilities/solana";
import type { Contributor } from "@/features/discoveries/types";

let devSecret: Buffer | null = null;

/**
 * Development only, when AUTH_SECRET is unset: a random secret kept in
 * .cache/dev-auth-secret (git-ignored). It has to live on disk, not in memory:
 * the dev server compiles each API route separately, so in-memory state isn't
 * shared between the challenge and verify routes.
 */
function developmentSecret(): Buffer {
  if (devSecret) return devSecret;
  const file = join(process.cwd(), ".cache", "dev-auth-secret");
  try {
    devSecret = Buffer.from(readFileSync(file, "utf8").trim(), "base64");
  } catch {
    devSecret = randomBytes(32);
    mkdirSync(join(process.cwd(), ".cache"), { recursive: true });
    writeFileSync(file, devSecret.toString("base64"), { mode: 0o600 });
    console.warn("AUTH_SECRET isn't set; created a development secret in .cache/dev-auth-secret.");
  }
  return devSecret;
}

/** AUTH_SECRET signs the cookies. Required in production; development falls back to a local secret. */
function secret(): Buffer {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return Buffer.from(value);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set (at least 32 characters) to sign players in.");
  }
  return developmentSecret();
}

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");

/** `payload.signature`, HMAC-SHA256. `exp` is seconds since the epoch. */
export function signToken(payload: Record<string, unknown> & { exp: number }) {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readToken<T extends { exp: number }>(token: string | undefined, now = Date.now()): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    return typeof payload.exp === "number" && payload.exp * 1000 > now ? payload : null;
  } catch {
    return null;
  }
}

/** A Solana address is a base58-encoded 32-byte ed25519 public key. */
export function isSolanaAddress(address: unknown): address is string {
  if (typeof address !== "string" || address.length < 32 || address.length > 44) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

/** True when `signature` (base58) is the wallet `address`'s ed25519 signature of `message` (UTF-8). */
export function verifyWalletSignature(address: string, message: string, signature: string) {
  try {
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: b64url(Buffer.from(bs58.decode(address))) },
      format: "jwk",
    });
    return verify(null, Buffer.from(message, "utf8"), key, Buffer.from(bs58.decode(signature)));
  } catch {
    return false;
  }
}

export const newNonce = () => randomBytes(16).toString("hex");

/** The player as the rest of the app sees them: their wallet is their account. */
export function contributorFor(address: string): Contributor {
  return { username: address, displayName: shortAddress(address) };
}

export const cookieOptions = (maxAge: number, path = "/") => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path,
  maxAge,
});
