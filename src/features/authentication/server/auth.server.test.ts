// @vitest-environment node
import { generateKeyPairSync, sign } from "node:crypto";
import bs58 from "bs58";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeNext } from "../wallet-sign-in";
import { CHALLENGE_COOKIE, SESSION_COOKIE } from "../siws";
import { isSolanaAddress, readToken, signToken, verifyWalletSignature } from "./auth.server";

/** A throwaway ed25519 wallet: its base58 address and a signer. */
function wallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url");
  return {
    address: bs58.encode(raw),
    sign: (message: string) => bs58.encode(sign(null, Buffer.from(message, "utf8"), privateKey)),
  };
}

// A minimal stand-in for next/headers cookies(), shared across "requests".
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (opts: { name: string } | string) => void jar.delete(typeof opts === "string" ? opts : opts.name),
  }),
}));

const post = (body: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/auth/x", { method: "POST", body: JSON.stringify(body), headers: { origin } });

beforeEach(() => jar.clear());

describe("signed tokens", () => {
  it("round-trips, and rejects tampering and expiry", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = signToken({ sub: "abc", exp });
    expect(readToken<{ sub: string; exp: number }>(token)?.sub).toBe("abc");
    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "attacker", exp })).toString("base64url");
    expect(readToken(`${forged}.${mac}`)).toBeNull();
    expect(readToken(`${body}.${mac.slice(0, -2)}xx`)).toBeNull();
    expect(readToken(signToken({ sub: "abc", exp: Math.floor(Date.now() / 1000) - 1 }))).toBeNull();
    expect(readToken(undefined)).toBeNull();
  });
});

describe("wallet signatures", () => {
  it("accepts the wallet's own signature and nothing else", () => {
    const alice = wallet();
    const bob = wallet();
    expect(verifyWalletSignature(alice.address, "hello", alice.sign("hello"))).toBe(true);
    expect(verifyWalletSignature(alice.address, "hello!", alice.sign("hello"))).toBe(false);
    expect(verifyWalletSignature(alice.address, "hello", bob.sign("hello"))).toBe(false);
    expect(verifyWalletSignature(alice.address, "hello", "not-a-signature")).toBe(false);
  });

  it("validates addresses", () => {
    expect(isSolanaAddress(wallet().address)).toBe(true);
    expect(isSolanaAddress("hello")).toBe(false);
    expect(isSolanaAddress(42)).toBe(false);
  });
});

describe("sign-in flow (challenge → verify → session)", () => {
  const routes = async () => ({
    challenge: (await import("@/app/api/auth/challenge/route")).POST,
    verify: (await import("@/app/api/auth/verify/route")).POST,
    session: (await import("@/app/api/auth/session/route")).GET,
    logout: (await import("@/app/api/auth/logout/route")).POST,
  });

  it("signs a wallet in with its signature of the issued message, then out", async () => {
    const { challenge, verify, session, logout } = await routes();
    const alice = wallet();
    const { message } = await (await challenge(post({ address: alice.address }))).json();
    expect(message).toContain(alice.address);
    expect(message).toContain("won't send a transaction");
    expect(message).toContain("localhost:3000 wants you to sign in");

    const response = await verify(post({ address: alice.address, signature: alice.sign(message) }));
    expect(response.status).toBe(200);
    expect(jar.has(SESSION_COOKIE)).toBe(true);
    expect(jar.has(CHALLENGE_COOKIE)).toBe(false);
    expect((await (await session()).json()).user.username).toBe(alice.address);

    await logout(post({}));
    expect((await (await session()).json()).user).toBeNull();
  });

  it("refuses a signature by another wallet, a different message, or a replayed challenge", async () => {
    const { challenge, verify } = await routes();
    const alice = wallet();
    const mallory = wallet();

    let { message } = await (await challenge(post({ address: alice.address }))).json();
    expect((await verify(post({ address: alice.address, signature: mallory.sign(message) }))).status).toBe(401);

    ({ message } = await (await challenge(post({ address: alice.address }))).json());
    expect((await verify(post({ address: alice.address, signature: alice.sign(`${message} `) }))).status).toBe(401);

    ({ message } = await (await challenge(post({ address: alice.address }))).json());
    const signature = alice.sign(message);
    expect((await verify(post({ address: alice.address, signature }))).status).toBe(200);
    // The challenge is single-use.
    expect((await verify(post({ address: alice.address, signature }))).status).toBe(401);
    expect(jar.has(SESSION_COOKIE)).toBe(true);
  });

  it("refuses requests from other sites", async () => {
    const { challenge, verify, logout } = await routes();
    const alice = wallet();
    expect((await challenge(post({ address: alice.address }, "https://evil.example"))).status).toBe(403);
    expect((await verify(post({ address: alice.address, signature: "x" }, "https://evil.example"))).status).toBe(403);
    expect((await logout(post({}, "https://evil.example"))).status).toBe(403);
  });

  it("refuses an invalid address up front", async () => {
    const { challenge } = await routes();
    expect((await challenge(post({ address: "nope" }))).status).toBe(400);
  });
});

describe("safeNext", () => {
  it("only allows same-site paths outside /auth", () => {
    expect(safeNext("/discoveries/abc")).toBe("/discoveries/abc");
    expect(safeNext("https://evil.example")).toBe("/world");
    expect(safeNext("//evil.example")).toBe("/world");
    expect(safeNext("/auth/login")).toBe("/world");
    expect(safeNext(null)).toBe("/world");
  });
});
