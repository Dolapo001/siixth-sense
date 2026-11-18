import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { Contributor } from "@/features/discoveries/types";

export type Session = { user: Contributor };

/** The dev-only signed-in user. Clearly labelled wherever it appears. */
export const SAMPLE_VIEWER: Contributor = { username: "sample_viewer", displayName: "You (sample viewer)" };

/**
 * Opt-in: NEXT_PUBLIC_DEV_SAMPLE_VIEWER=true signs development in as the
 * sample viewer, to try community actions against sample data. Off by
 * default, so dev shows the signed-out experience like production.
 */
export function sampleViewerEnabled() {
  return devMocksEnabled() && process.env.NEXT_PUBLIC_DEV_SAMPLE_VIEWER === "true";
}

/**
 * Who is signed in. Auth isn't decided yet (see docs/phase-1-assessment.md),
 * so there is no real session: every community action asks the user to sign
 * in, unless the sample viewer is switched on (see above).
 */
export async function getSession(): Promise<Session | null> {
  if (sampleViewerEnabled()) {
    return { user: SAMPLE_VIEWER };
  }
  return null;
}
