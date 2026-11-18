// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import bs58 from "bs58";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/backend.server";
import { safeNext } from "../wallet-sign-in";
import { TERMS_REQUIRED } from "../siws";
import { isSolanaAddress } from "./wallet.server";

const API = "http://backend.test/api/v1";

function address() {
  const { publicKey } = generateKeyPairSync("ed25519");
  return bs58.encode(Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url"));
}

/** An unsigned JWT-shaped token expiring `inSeconds` from now (the app reads exp, the backend verifies). */
function jwt(name: string, inSeconds: number) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part({ exp: Math.floor(Date.now() / 1000) + inSeconds, name })}.sig`;
}

// Minimal stand-ins for next/headers: cookies() shared across "requests", and
// headers() for the incoming request (what the host in front of the app set).
const jar = new Map<string, string>();
let incoming = new Headers();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (opts: { name: string } | string) => void jar.delete(typeof opts === "string" ? opts : opts.name),
  }),
  headers: async () => incoming,
}));

const envelope = (data: unknown, status = 200) => Response.json({ success: true, message: "OK", data }, { status });
const failure = (message: string, status: number, code = "conflict") =>
  Response.json({ success: false, message, code, errors: {} }, { status });

/** Fake backend: routes by path; records every call. */
type Call = { path: string; method: string; auth: string | null; forwardedFor: string | null; body: unknown };
let calls: Call[] = [];
let handler: (call: Call) => Response;

beforeEach(() => {
  jar.clear();
  incoming = new Headers();
  calls = [];
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      const raw = init.body;
      const text = typeof raw === "string" ? raw : raw instanceof ArrayBuffer ? new TextDecoder().decode(raw) : null;
      const call = {
        path: url.replace(API, ""),
        method: init.method ?? "GET",
        auth: headers.get("authorization"),
        forwardedFor: headers.get("x-forwarded-for"),
        body: text ? JSON.parse(text) : null,
      };
      calls.push(call);
      return handler(call);
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const post = (body: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/auth/x", { method: "POST", body: JSON.stringify(body), headers: { origin } });

const me = { username: "sol_abc", email: null, role: "player", profile: { display_name: "", avatar_url: "" } };

const routes = async () => ({
  challenge: (await import("@/app/api/auth/challenge/route")).POST,
  verify: (await import("@/app/api/auth/verify/route")).POST,
  session: (await import("@/app/api/auth/session/route")).GET,
  logout: (await import("@/app/api/auth/logout/route")).POST,
});

describe("isSolanaAddress", () => {
  it("validates addresses before bothering the backend", () => {
    expect(isSolanaAddress(address())).toBe(true);
    expect(isSolanaAddress("hello")).toBe(false);
    expect(isSolanaAddress(42)).toBe(false);
  });
});

describe("wallet sign-in through the backend", () => {
  it("gets the challenge from the backend, keeps tokens in cookies, and signs out", async () => {
    const { challenge, verify, session, logout } = await routes();
    const wallet = address();
    const access = jwt("access", 1800);
    const refresh = jwt("refresh", 604800);
    handler = ({ path }) => {
      if (path === "/auth/wallet/challenge/") return envelope({ nonce: "n1", message: `Sign in\n${wallet}`, expires_at: "x" }, 201);
      if (path === "/auth/wallet/login/") return envelope({ access, refresh, new_account: false, username: "sol_abc" });
      if (path === "/auth/me/") return envelope(me);
      if (path === "/auth/logout/") return new Response(null, { status: 204 });
      return failure("Not found.", 404, "not_found");
    };

    const issued = await (await challenge(post({ address: wallet }))).json();
    expect(issued).toMatchObject({ nonce: "n1", message: `Sign in\n${wallet}` });
    expect(calls[0]).toMatchObject({ path: "/auth/wallet/challenge/", body: { address: wallet } });

    const response = await verify(post({ nonce: "n1", signature: "sig", acceptTerms: false }));
    expect(response.status).toBe(200);
    expect(calls.at(-2)).toMatchObject({ path: "/auth/wallet/login/", body: { nonce: "n1", signature: "sig", accept_terms: false } });
    expect(jar.get(ACCESS_COOKIE)).toBe(access);
    expect(jar.get(REFRESH_COOKIE)).toBe(refresh);
    // Tokens never reach the browser in a response body.
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain(access);
    expect(body.user).toEqual({ username: "sol_abc", displayName: "sol_abc", avatarId: null });

    expect((await (await session()).json()).user.username).toBe("sol_abc");
    expect(calls.at(-1)?.auth).toBe(`Bearer ${access}`);

    expect((await logout(post({}))).status).toBe(204);
    expect(calls.at(-1)).toMatchObject({ path: "/auth/logout/", body: { refresh } });
    expect(jar.size).toBe(0);
  });

  it("asks for the terms when the wallet has no account yet", async () => {
    const { verify } = await routes();
    handler = () => failure("No account for this wallet yet. Accept the terms to create one, then sign in again.", 409);
    const response = await verify(post({ nonce: "n1", signature: "sig" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe(TERMS_REQUIRED);
    expect(jar.size).toBe(0);
  });

  it("passes on the backend's reason for a bad signature", async () => {
    const { verify } = await routes();
    handler = () => failure("Signature verification failed.", 400, "validation_error");
    const response = await verify(post({ nonce: "n1", signature: "sig" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Signature verification failed.");
  });

  it("refreshes an expired access token, rotating both cookies", async () => {
    const { session } = await routes();
    const fresh = jwt("fresh", 1800);
    const rotated = jwt("rotated", 604800);
    jar.set(ACCESS_COOKIE, jwt("old", -10));
    jar.set(REFRESH_COOKIE, jwt("refresh", 604800));
    handler = ({ path }) =>
      path === "/auth/refresh/" ? envelope({ access: fresh, refresh: rotated }) : envelope(me);
    expect((await (await session()).json()).user.username).toBe("sol_abc");
    expect(calls.map((c) => c.path)).toEqual(["/auth/refresh/", "/auth/me/"]);
    expect(calls[1].auth).toBe(`Bearer ${fresh}`);
    expect(jar.get(REFRESH_COOKIE)).toBe(rotated);
  });

  it("signs out when the refresh token is no longer accepted", async () => {
    const { session } = await routes();
    jar.set(REFRESH_COOKIE, jwt("revoked", 604800));
    handler = ({ path }) =>
      path === "/auth/refresh/" ? failure("Token is blacklisted", 401, "not_authenticated") : failure("No credentials.", 401, "not_authenticated");
    expect((await (await session()).json()).user).toBeNull();
    expect(jar.size).toBe(0);
  });

  it("counts only a verified email as a way in besides the wallet, like the backend's unlink guard", async () => {
    const { session } = await routes();
    jar.set(ACCESS_COOKIE, jwt("live", 1800));
    const walletOnly = async (account: object) => {
      handler = () => envelope({ ...me, ...account });
      return (await (await session()).json()).walletOnly;
    };
    expect(await walletOnly({ email: null })).toBe(true);
    expect(await walletOnly({ email: "a@b.io", email_verified: false })).toBe(true); // can't reach password reset
    expect(await walletOnly({ email: "a@b.io", email_verified: true })).toBe(false);
  });

  it("passes the player's address to every backend call the throttles count", async () => {
    // Without it every player shares the backend's per-IP throttle buckets,
    // and a throttled token refresh signs the player out.
    const { challenge, verify, session } = await routes();
    incoming = new Headers({ "x-forwarded-for": "203.0.113.7" });
    const fresh = jwt("fresh", 1800);
    jar.set(ACCESS_COOKIE, jwt("old", -10));
    // Unique: refreshes are shared for 10s per token, across tests too.
    jar.set(REFRESH_COOKIE, jwt("refresh-address-test", 604800));
    handler = ({ path }) =>
      path === "/auth/wallet/challenge/"
        ? envelope({ nonce: "n", message: "m", expires_at: "2026-01-01T00:00:00Z" })
        : path === "/auth/wallet/login/"
          ? envelope({ access: fresh, refresh: jwt("r", 604800), new_account: false })
          : path === "/auth/refresh/"
            ? envelope({ access: fresh, refresh: jwt("rotated", 604800) })
            : envelope(me);

    await session(); // refresh, then auth/me/
    await challenge(post({ address: address() }));
    await verify(post({ nonce: "n", signature: "s" }));

    const paths = calls.map((c) => c.path);
    expect(paths).toEqual(expect.arrayContaining(["/auth/refresh/", "/auth/me/", "/auth/wallet/challenge/", "/auth/wallet/login/"]));
    expect(calls.every((c) => c.forwardedFor === "203.0.113.7")).toBe(true);
  });

  it("refuses requests from other sites", async () => {
    const { challenge, verify, logout } = await routes();
    expect((await challenge(post({ address: address() }, "https://evil.example"))).status).toBe(403);
    expect((await verify(post({ nonce: "n", signature: "x" }, "https://evil.example"))).status).toBe(403);
    expect((await logout(post({}, "https://evil.example"))).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("refuses an invalid address up front", async () => {
    const { challenge } = await routes();
    expect((await challenge(post({ address: "nope" }))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("backend proxy", () => {
  const proxy = async (path: string[], init: RequestInit = {}) => {
    const { GET, POST } = await import("@/app/api/backend/[...path]/route");
    const handle = (init.method ?? "GET") === "GET" ? GET : POST;
    const request = new Request(`http://localhost:3000/api/backend/${path.join("/")}?page=2`, init);
    return handle(request, { params: Promise.resolve({ path }) });
  };

  it("adds the player's token and the backend's trailing slash", async () => {
    const access = jwt("access", 1800);
    jar.set(ACCESS_COOKIE, access);
    handler = () => envelope({ count: 0, results: [] });
    const response = await proxy(["discoveries"]);
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({ path: "/discoveries/?page=2", auth: `Bearer ${access}` });
  });

  it("never hands out tokens: the token-issuing auth routes aren't reachable", async () => {
    for (const path of [
      ["auth", "login"],
      ["auth", "refresh"],
      ["auth", "logout"],
      ["auth", "wallet", "login"],
      ["auth", "verify-email", "x"],
      ["auth", ".."],
    ]) {
      expect((await proxy(path, { method: "POST", headers: { origin: "http://localhost:3000" } })).status).toBe(404);
    }
    expect(calls).toHaveLength(0);
  });

  it("lets through the email routes, which don't touch tokens", async () => {
    handler = () => envelope({ detail: "ok" });
    for (const path of [["auth", "verify-email"], ["auth", "resend-verification"]]) {
      expect((await proxy(path, { method: "POST", body: "{}", headers: { origin: "http://localhost:3000" } })).status).toBe(200);
    }
    expect(calls.map((c) => c.path.split("?")[0])).toEqual(["/auth/verify-email/", "/auth/resend-verification/"]);
  });

  it("refuses cross-site writes", async () => {
    const response = await proxy(["discoveries"], { method: "POST", body: "{}", headers: { origin: "https://evil.example" } });
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("retries once with a fresh token when the backend rejects the current one", async () => {
    jar.set(ACCESS_COOKIE, jwt("revoked-but-unexpired", 1800));
    // A refresh token of its own: refreshes of one token are shared for a few seconds.
    jar.set(REFRESH_COOKIE, jwt("refresh-for-retry", 604800));
    const fresh = jwt("fresh", 1800);
    handler = ({ path, auth }) => {
      if (path === "/auth/refresh/") return envelope({ access: fresh, refresh: jwt("rotated", 604800) });
      return auth === `Bearer ${fresh}` ? envelope({ ok: true }) : failure("Token invalid.", 401, "not_authenticated");
    };
    const response = await proxy(["discoveries", "abc", "comments"], {
      method: "POST",
      body: JSON.stringify({ body: "Nice" }),
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(calls.map((c) => c.path)).toEqual(["/discoveries/abc/comments/?page=2", "/auth/refresh/", "/discoveries/abc/comments/?page=2"]);
    expect(calls[2].body).toEqual({ body: "Nice" });
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
