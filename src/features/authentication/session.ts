import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { Contributor } from "@/features/discoveries/types";

export type Session = {
  user: Contributor;
  /**
   * The wallet is the only way into this account. Unlinking it would lock the
   * player out for good, so the UI must not offer that until they've added
   * another way in (or the backend grows a guard).
   */
  walletOnly: boolean;
};

/** The dev-only signed-in user. Clearly labelled wherever it appears. */
export const SAMPLE_VIEWER: Contributor = { username: "sample_viewer", displayName: "You (sample viewer)" };

/**
 * Opt-in: NEXT_PUBLIC_DEV_SAMPLE_VIEWER=true signs development in as the
 * sample viewer, to try community actions against sample data. Off by
 * default, so dev shows the signed-out experience like production. Ignored
 * when the backend is connected: then only real accounts sign in.
 */
export function sampleViewerEnabled() {
  return devMocksEnabled() && !liveApiEnabled() && process.env.NEXT_PUBLIC_DEV_SAMPLE_VIEWER === "true";
}

/**
 * Who is signed in: the backend session from /api/auth/session (wallet
 * sign-in), or the opt-in development sample viewer. Null when signed out or
 * when the session can't be read.
 */
export async function getSession(): Promise<Session | null> {
  if (sampleViewerEnabled()) {
    return { user: SAMPLE_VIEWER, walletOnly: false };
  }
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return null;
    const { user, walletOnly } = (await response.json()) as { user: Contributor | null; walletOnly?: boolean };
    return user ? { user, walletOnly: walletOnly === true } : null;
  } catch {
    return null;
  }
}
