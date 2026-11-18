/*
 * Server-only: talks to the Sixth Sense backend on the player's behalf.
 *
 * The backend signs players in with JWTs (30-minute access token, 7-day
 * rotating refresh token). They live in HTTP-only cookies set by this app, so
 * page scripts never see them. Requests attach the access token; when it has
 * expired the refresh token is exchanged for a new pair first.
 */

import { cookies } from "next/headers";
import { apiBaseUrl } from "./config";

export const ACCESS_COOKIE = "ss_access";
export const REFRESH_COOKIE = "ss_refresh";

/** Refresh tokens last 7 days on the backend. */
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Refresh a little early so a token doesn't expire between here and the backend. */
const EXPIRY_MARGIN_SECONDS = 30;

export type TokenPair = { access: string; refresh: string };

export class BackendUnavailableError extends Error {
  constructor() {
    super("The Sixth Sense backend isn't configured (NEXT_PUBLIC_API_BASE_URL).");
    this.name = "BackendUnavailableError";
  }
}

export function backendUrl(path: string) {
  const base = apiBaseUrl();
  if (!base) throw new BackendUnavailableError();
  return `${base}/${path.replace(/^\/+/, "")}`;
}

/** Seconds since the epoch when a JWT expires, read without verifying it (the backend verifies). */
export function tokenExpiry(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function storeTokens({ access, refresh }: TokenPair) {
  const jar = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const accessExp = tokenExpiry(access) ?? now + 30 * 60;
  const refreshExp = tokenExpiry(refresh) ?? now + REFRESH_TTL_SECONDS;
  jar.set(ACCESS_COOKIE, access, cookieOptions(Math.max(1, accessExp - now)));
  jar.set(REFRESH_COOKIE, refresh, cookieOptions(Math.max(1, refreshExp - now)));
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete({ name: ACCESS_COOKIE, path: "/" });
  jar.delete({ name: REFRESH_COOKIE, path: "/" });
}

/**
 * Refresh tokens rotate and the old one is blacklisted, so two requests
 * refreshing with the same token at once would sign the player out. Requests
 * that arrive together share one refresh.
 */
const refreshing = new Map<string, Promise<TokenPair | null>>();

async function exchangeRefreshToken(refresh: string): Promise<TokenPair | null> {
  let pending = refreshing.get(refresh);
  if (!pending) {
    pending = fetch(backendUrl("auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json().catch(() => null)) as { data?: Partial<TokenPair> } | null;
        const access = body?.data?.access;
        return access ? { access, refresh: body?.data?.refresh ?? refresh } : null;
      })
      .catch(() => null);
    refreshing.set(refresh, pending);
    // Keep the result briefly for requests that were already in flight.
    void pending.finally(() => setTimeout(() => refreshing.delete(refresh), 10_000));
  }
  return pending;
}

/**
 * A usable access token for this request, refreshing it (and updating the
 * cookies) if it has expired. Null when signed out or the session has ended.
 */
export async function currentAccessToken({ forceRefresh = false } = {}): Promise<string | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const exp = tokenExpiry(access);
  if (!forceRefresh && access && exp && exp - EXPIRY_MARGIN_SECONDS > Date.now() / 1000) return access;

  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const pair = await exchangeRefreshToken(refresh);
  if (!pair) {
    await clearTokens();
    return null;
  }
  await storeTokens(pair);
  return pair.access;
}

type BackendInit = { method?: string; headers?: Record<string, string>; body?: BodyInit | null; signal?: AbortSignal };

/**
 * Calls the backend as the signed-in player (or anonymously when signed out).
 * Retries once with a refreshed token if the backend says the token is no good.
 * `body` must be replayable (a string or buffer), since a retry sends it again.
 */
export async function backendFetch(path: string, init: BackendInit = {}): Promise<Response> {
  const send = (token: string | null) =>
    fetch(backendUrl(path), {
      method: init.method ?? "GET",
      headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body,
      signal: init.signal,
      cache: "no-store",
      redirect: "manual",
    });

  const token = await currentAccessToken();
  const response = await send(token);
  if (response.status !== 401 || !token) return response;

  const fresh = await currentAccessToken({ forceRefresh: true });
  return fresh ? send(fresh) : response;
}
