import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { AccountSettings, Privacy } from "../types";

/** The signed-in player's account settings. Refusals throw ActionRefusedError with a player-safe message. */
export interface SettingsDataSource {
  readonly kind: "sample" | "live";
  /** Null when signed out. */
  get(): Promise<AccountSettings | null>;
  setPrivacy(change: Partial<Privacy>): Promise<AccountSettings>;
  /** Adds or changes the email; it stays unverified until the emailed link is used. */
  setEmail(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  /** From the emailed link; works signed out. */
  verifyEmail(token: string): Promise<void>;
  /** Anonymises and closes the account. `password` only for accounts that have one. */
  deleteAccount(password?: string): Promise<void>;
}

export async function getSettingsDataSource(): Promise<SettingsDataSource | null> {
  if (liveApiEnabled()) {
    const { createApiSettingsSource } = await import("./api-source");
    return createApiSettingsSource();
  }
  if (devMocksEnabled()) {
    const { createMockSettingsSource } = await import("./mock-source");
    return createMockSettingsSource();
  }
  return null;
}
