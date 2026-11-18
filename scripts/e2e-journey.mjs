// Phase A end-to-end journey against a live backend. Drives the real Next.js
// routes (/api/auth/*, /api/backend/*) over HTTP with a cookie jar, so the
// proxy, the JWT cookies and every data adapter's contract are exercised
// exactly as the browser would. Wallet signing is done here with a throwaway
// ed25519 keypair instead of a browser extension.
//
// Run: `node scripts/e2e-journey.mjs` (needs `pnpm dev` and the backend up).
//   --base      frontend origin (default http://localhost:3000)
//   --secret    base58 secret key, to reuse an account across runs
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import bs58 from "bs58";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};

const BASE = arg("base", "http://localhost:3000");
// Stands in for the address a real host (e.g. Vercel) puts in X-Forwarded-For.
// With the backend's NUM_PROXIES=1 each run gets its own throttle bucket; with
// NUM_PROXIES=0 the header is ignored and all runs share one. A TEST-NET-2
// address, so it can never be a real player's.
const CLIENT_IP = arg("ip", `198.51.100.${1 + Math.floor(Math.random() * 254)}`);

// ---------------------------------------------------------------- reporting

const results = [];
let indent = "";

const record = (status, name, detail) => {
  results.push({ status, name, detail });
  const mark = status === "pass" ? "✅" : status === "fail" ? "❌" : "⏭️ ";
  console.log(`${mark} ${indent}${name}${detail ? ` — ${detail}` : ""}`);
};

async function step(name, fn) {
  try {
    const detail = await fn();
    record("pass", name, detail);
    return true;
  } catch (error) {
    record("fail", name, error.message);
    return false;
  }
}

// ------------------------------------------------------------------- wallet

/** A throwaway Solana identity: address is base58 of the raw ed25519 public key. */
function makeWallet(secretBase58) {
  let privateKey;
  if (secretBase58) {
    const raw = bs58.decode(secretBase58).subarray(0, 32);
    privateKey = createPrivateKey({
      key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), raw]),
      format: "der",
      type: "pkcs8",
    });
  } else {
    privateKey = generateKeyPairSync("ed25519").privateKey;
  }
  const publicKey = createPublicKey(privateKey);
  const rawPublic = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const rawPrivate = Buffer.from(privateKey.export({ format: "jwk" }).d, "base64url");
  return {
    address: bs58.encode(rawPublic),
    secret: bs58.encode(rawPrivate),
    sign: (message) => bs58.encode(cryptoSign(null, Buffer.from(message, "utf8"), privateKey)),
  };
}

// ---------------------------------------------------------------- http + jar

const jar = new Map();

function remember(response) {
  for (const line of response.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (value === "" || /expires=Thu, 01 Jan 1970/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
}

const cookieHeader = () =>
  jar.size ? [...jar].map(([name, value]) => `${name}=${value}`).join("; ") : undefined;

/**
 * Mirrors `apiUrl()` in src/lib/api/client.ts: the proxy adds the backend's
 * trailing slash itself, and sending one earns a 308 from Next.js — which
 * drops a POST body on the way through, so uploads silently arrive empty.
 */
function proxyPath(path) {
  if (!path.startsWith("/api/backend/")) return path;
  const [route, search] = path.split("?");
  return route.replace(/\/+$/, "") + (search ? `?${search}` : "");
}

async function http(method, path, body, { raw = false } = {}) {
  path = proxyPath(path);
  const headers = { Origin: BASE, "X-Forwarded-For": CLIENT_IP };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;
  if (body !== undefined && !raw) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  remember(response);

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text.slice(0, 200);
  }
  return { status: response.status, ok: response.ok, payload };
}

const expect = (response, ...codes) => {
  if (!codes.includes(response.status)) {
    const message =
      typeof response.payload === "object" && response.payload
        ? JSON.stringify(response.payload).slice(0, 300)
        : String(response.payload).slice(0, 300);
    throw new Error(`expected ${codes.join("/")}, got ${response.status}: ${message}`);
  }
  return response.payload;
};

/** Unwraps whatever the proxy passes through: `{data}` envelope or a bare body. */
const data = (payload) => (payload && typeof payload === "object" && "data" in payload ? payload.data : payload);

// -------------------------------------------------------------------- flows

async function signIn(wallet, { acceptTerms }) {
  const challenge = expect(await http("POST", "/api/auth/challenge", { address: wallet.address }), 200);
  if (!challenge.nonce || !challenge.message) throw new Error("challenge missing nonce/message");
  const signature = wallet.sign(challenge.message);
  const verify = await http("POST", "/api/auth/verify", {
    nonce: challenge.nonce,
    signature,
    acceptTerms,
  });
  return verify;
}

/**
 * The one leg that costs money. Mirrors what the analysis adapter does:
 * multipart upload → POST analyses/ → poll analyses/{id}/ → publish.
 */
async function analysisLeg() {
  const file = arg("image", "public/brand/marketing/logos/sixth-sense-logo.png");
  const bytes = await readFile(file);

  let image = null;
  const uploaded = await step("upload a screenshot", async () => {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), basename(file));
    const response = await http("POST", "/api/backend/images/upload", form, { raw: true });
    image = data(expect(response, 200, 201));
    if (!image?.public_id) throw new Error("upload returned no public_id");
    return `${image.public_id} · ${image.width}×${image.height}`;
  });
  if (!uploaded) return;

  let job = null;
  const started = await step("start an analysis", async () => {
    // Re-uploading identical bytes returns the existing image, which may
    // already have an analysis — the adapter relies on exactly this.
    if (image.latest_analysis) {
      job = image.latest_analysis;
      return `${job} (existing)`;
    }
    const body = data(expect(await http("POST", "/api/backend/analyses", { image: image.public_id }), 200, 201));
    if (!body?.public_id) throw new Error("analyses/ returned no public_id");
    job = body.public_id;
    return job;
  });
  if (!started) return;

  const finished = await step("poll the job to a terminal state", async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const body = data(expect(await http("GET", `/api/backend/analyses/${job}`), 200));
      const status = body?.status;
      if (["completed", "completed_partial", "failed", "cancelled"].includes(status)) {
        if (status === "failed") throw new Error(`analysis failed: ${body.error ?? "no reason given"}`);
        return `${status} · ${body.entities?.length ?? 0} detections`;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("still not terminal after 60s");
  });
  if (!finished) return;

  await step("publish the analysis as a discovery", async () => {
    const response = await http("POST", "/api/backend/discoveries", {
      analysis: job,
      title: "Journey harness test discovery",
      description: "",
    });
    const body = data(expect(response, 200, 201));
    if (!body?.public_id) throw new Error("discoveries/ returned no public_id");
    return body.public_id;
  });
}

/**
 * Comment, suggest, add evidence, follow, report and vote on someone else's
 * public discovery. Optional fields are sent as "" because that is what
 * src/features/discoveries/data/api-source.ts sends when the player leaves
 * them empty — the same shape that broke publishing.
 */
async function communityLeg(me) {
  const list = data((await http("GET", "/api/backend/discoveries/?page_size=25")).payload);
  const target = list?.results?.find((d) => (d.contributor?.username ?? d.contributor) !== me);
  if (!target) {
    record("fail", "find someone else's public discovery", "none listed — publish one from another account first");
    return;
  }
  const id = target.public_id;
  const owner = target.contributor?.username ?? target.contributor;
  const path = `/api/backend/discoveries/${id}`;

  await step("viewer permissions on someone else's discovery", async () => {
    const v = data(expect(await http("GET", `${path}/`), 200))?.viewer;
    if (!v) throw new Error("detail has no viewer block");
    if (!v.canComment || !v.canSuggest) throw new Error(`expected comment+suggest allowed: ${JSON.stringify(v)}`);
    return `vote allowed: ${v.vote?.allowed} (${v.vote?.reason ?? "—"})`;
  });

  await step("comment", async () => {
    const c = data(expect(await http("POST", `${path}/comments/`, { body: "Harness comment: checking the comment path." }), 200, 201));
    if (!c?.public_id) throw new Error("no public_id");
    return c.public_id;
  });

  await step("suggest an identification, no note", async () => {
    const s = data(expect(await http("POST", `${path}/suggestions/`, { label: "Harness suggestion", category: "vehicle", note: "" }), 200, 201));
    return s?.public_id ?? s?.id ?? "ok";
  });

  await step("add written evidence, no link", async () => {
    const e = data(expect(await http("POST", `${path}/evidence/`, { text: "Harness evidence: checking the evidence path.", url: "" }), 200, 201));
    return e?.public_id ?? e?.id ?? "ok";
  });

  if (owner) {
    await step("follow and unfollow the contributor", async () => {
      const on = data(expect(await http("PUT", `/api/backend/users/${owner}/follow/`), 200, 201));
      if (on?.following !== true) throw new Error(`follow returned ${JSON.stringify(on)}`);
      const off = data(expect(await http("DELETE", `/api/backend/users/${owner}/follow/`), 200, 204));
      if (off && off.following !== false) throw new Error(`unfollow returned ${JSON.stringify(off)}`);
      return owner;
    });
  }

  await step("report, no details", async () => {
    const r = data(
      expect(await http("POST", "/api/backend/reports/", { target: { kind: "discovery", id }, reason: "spam", details: "" }), 200, 201),
    );
    if (!r?.reportId) throw new Error(`no reportId: ${JSON.stringify(r)}`);
    return r.reportId;
  });

  // Every vote needs a reason (decision 2026-11-18): the vote panel asks for
  // one on Confirm as well as Dispute. Pin the backend side of that contract;
  // if this starts passing without a reason, the two have drifted apart again.
  await step("backend rejects a vote with no reason", async () => {
    const response = await http("POST", `${path}/votes/`, { vote: "confirm", reason: "" });
    expect(response, 400);
    if (!/reason/i.test(response.payload?.message ?? "")) throw new Error(`400 for another reason: ${response.payload?.message}`);
    return "400, reason required";
  });

  // A new account is a player, not a Verified Contributor: the server must
  // refuse, and say why, rather than accept or fail obscurely.
  await step("vote refused for a non-contributor, with a reason", async () => {
    const response = await http("POST", `${path}/votes/`, { vote: "confirm", reason: "Matches the badge." });
    expect(response, 403);
    return response.payload?.message ?? "403";
  });
}

/** An expired access token must be swapped for a new one, not sign the player out. */
async function refreshLeg(username) {
  await step("expired access token is refreshed, player stays signed in", async () => {
    const before = jar.get("ss_refresh");
    if (!before) throw new Error("no refresh cookie to test with");
    jar.set("ss_access", "expired.not-a-jwt.x"); // unreadable exp counts as expired
    const payload = expect(await http("GET", "/api/auth/session"), 200);
    if (payload.user?.username !== username) throw new Error(`signed out instead: ${JSON.stringify(payload)}`);
    const access = jar.get("ss_access");
    if (!access || access.startsWith("expired")) throw new Error("no new access cookie was set");
    if (jar.get("ss_refresh") === before) throw new Error("refresh token was not rotated");
    return "new access + rotated refresh";
  });
}

async function main() {
  console.log(`\nSixth Sense — Phase A journey\nfrontend ${BASE} · client ${CLIENT_IP}\n`);

  const wallet = makeWallet(arg("secret"));
  console.log(`wallet ${wallet.address}`);
  console.log(`secret ${wallet.secret}  (reuse with --secret)\n`);

  console.log("── Authentication");

  await step("challenge rejects a non-wallet address", async () => {
    const response = await http("POST", "/api/auth/challenge", { address: "not-a-wallet" });
    expect(response, 400);
    return "400";
  });

  await step("cross-site sign-in is refused", async () => {
    const response = await fetch(`${BASE}/api/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ address: wallet.address }),
    });
    if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
    return "403";
  });

  await step("new wallet without terms is refused", async () => {
    const response = await signIn(wallet, { acceptTerms: false });
    expect(response, 409);
    const code = response.payload?.error?.code;
    if (code !== "terms_required") throw new Error(`expected terms_required, got ${code}`);
    return "409 terms_required";
  });

  const signedIn = await step("new wallet signs in after accepting terms", async () => {
    const response = await signIn(wallet, { acceptTerms: true });
    const payload = expect(response, 200);
    if (!payload.newAccount) throw new Error("expected newAccount: true");
    if (!jar.has("ss_access")) throw new Error("ss_access cookie was not set");
    return `${payload.user?.username} · newAccount`;
  });

  if (!signedIn) {
    summarise();
    return;
  }

  await step("session reports the signed-in user", async () => {
    const payload = expect(await http("GET", "/api/auth/session"), 200);
    if (!payload.user) throw new Error("session returned no user");
    return payload.user.username;
  });

  const me = await http("GET", "/api/backend/auth/me/");
  const username = data(me.payload)?.username;

  // Every path below is one the frontend adapters actually call. A read that
  // returns an empty list still passes: the catalogue is unseeded, so "no rows"
  // is expected, while a 404/500 means the contract is wrong.
  console.log("\n── Reads the adapters depend on");

  const reads = [
    ["auth/me/", "profile: signed-in user"],
    [`users/${username}/`, "profile: public profile"],
    ["leaderboard/?dimension=reputation&period=all", "leaderboard"],
    ["discoveries/?page_size=5", "discoveries: list"],
    ["regions/", "discoveries: regions filter"],
    ["world/markers/", "world: markers"],
    ["analyses/constraints/", "analysis: upload constraints"],
    ["web3/config/", "web3: network config"],
    ["web3/wallet/me/", "web3: linked wallet"],
    ["web3/wallet/transactions/", "web3: transactions"],
    ["attestations/public/", "web3: public attestations"],
    ["rewards/me/", "rewards"],
    ["notifications/", "notifications: list"],
    ["notifications/unread-count/", "notifications: unread count"],
    ["me/settings/", "settings"],
  ];

  for (const [path, name] of reads) {
    await step(name, async () => {
      const response = await http("GET", `/api/backend/${path}`);
      const payload = expect(response, 200);
      const body = data(payload);
      if (Array.isArray(body)) return `${body.length} rows`;
      if (body && typeof body === "object" && Array.isArray(body.results)) {
        return `${body.results.length} of ${body.count ?? "?"}`;
      }
      return "ok";
    });
  }

  console.log("\n── Wallet and lock-out guard");

  // Wallet sign-in links the wallet as a side effect, so a wallet-only account
  // arrives here already linked. That is also why unlinking it is a lock-out.
  await step("sign-in already linked the wallet", async () => {
    const body = data(expect(await http("GET", "/api/backend/web3/wallet/me/"), 200));
    if (!body?.wallet?.address) throw new Error("wallet/me/ reports no wallet after wallet sign-in");
    if (body.wallet.address !== wallet.address) throw new Error("wallet/me/ returned a different address");
    return `${body.wallet.address.slice(0, 8)}… verified`;
  });

  await step("linking a second wallet is refused", async () => {
    const other = makeWallet();
    // The challenge is issued for any address; the refusal comes at verify.
    const challenge = data(
      expect(await http("POST", "/api/backend/web3/wallet/challenge/", { address: other.address }), 200, 201),
    );
    const response = await http("POST", "/api/backend/web3/wallet/verify/", {
      address: other.address,
      nonce: challenge.nonce,
      signature: other.sign(challenge.message),
    });
    expect(response, 409);
    return "409 at verify";
  });

  await step("session flags the account as wallet-only", async () => {
    const payload = expect(await http("GET", "/api/auth/session"), 200);
    if (payload.walletOnly !== true) {
      throw new Error("walletOnly is not set, so the UI would offer the lock-out unlink");
    }
    return "walletOnly: true";
  });

  // Unlinking a wallet-only account's wallet would lock the player out for
  // good (signing in again creates a NEW account). The UI hides the button;
  // the backend must refuse it too.
  await step("backend refuses to unlink a wallet-only account's wallet", async () => {
    const response = await http("DELETE", "/api/backend/web3/wallet/disconnect/");
    if (response.status >= 200 && response.status < 300) {
      // Put it back so the rest of the run (and the account) still works.
      const challenge = data(
        expect(await http("POST", "/api/backend/web3/wallet/challenge/", { address: wallet.address }), 200, 201),
      );
      await http("POST", "/api/backend/web3/wallet/verify/", {
        address: wallet.address,
        nonce: challenge.nonce,
        signature: wallet.sign(challenge.message),
      });
      throw new Error(`unlink was allowed (${response.status}): the lock-out guard is missing`);
    }
    expect(response, 409);
    return "409";
  });

  // Off by default: unless the backend runs with
  // ANALYZER_BACKEND=apps.intelligence.analyzer.SampleAnalyzer (offline, free),
  // an upload spends Claude credits. Opt in with --analyse.
  if (process.argv.includes("--analyse")) {
    console.log("\n── Upload → analysis → publish");
    await analysisLeg();
  }

  console.log("\n── Discoveries");

  await step("discovery detail (first listed, if any)", async () => {
    const list = data(expect(await http("GET", "/api/backend/discoveries/?page_size=1"), 200));
    const first = list?.results?.[0];
    if (!first) return "skipped: no discoveries exist yet";
    const detail = data(expect(await http("GET", `/api/backend/discoveries/${first.public_id}/`), 200));
    if (!detail?.public_id) throw new Error("detail missing public_id");
    if (!("viewer" in detail)) throw new Error("detail missing server-computed `viewer` permissions");
    return detail.public_id;
  });

  console.log("\n── Community actions (bodies exactly as the adapter sends them)");
  await communityLeg(username);

  console.log("\n── Token refresh");
  await refreshLeg(username);

  console.log("\n── Sign-out");

  await step("logout clears the session cookies", async () => {
    expect(await http("POST", "/api/auth/logout"), 200, 204);
    if (jar.has("ss_access")) throw new Error("ss_access survived logout");
    const session = expect(await http("GET", "/api/auth/session"), 200);
    if (session.user) throw new Error("session still reports a user");
    return "cleared";
  });

  await step("returning wallet signs in to the same account", async () => {
    const response = await signIn(wallet, { acceptTerms: false });
    const payload = expect(response, 200);
    if (payload.newAccount) throw new Error("a second account was created for a known wallet");
    if (payload.user?.username !== username) throw new Error(`got ${payload.user?.username}, expected ${username}`);
    return payload.user.username;
  });

  summarise();
}

function summarise() {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n${passed} passed · ${failed} failed · ${skipped} skipped\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\nharness crashed:", error);
  process.exit(1);
});
