import { backendFetch } from "@/lib/api/backend.server";
import { readEnvelope } from "@/lib/api/client";
import { toContributor } from "@/lib/api/mappers";
import type { Contributor } from "@/features/discoveries/types";

export type BackendMe = {
  username: string;
  email: string | null;
  email_verified?: boolean;
  role: string;
  profile: { display_name: string; avatar_url: string };
};

export type SessionAccount = {
  user: Contributor;
  /**
   * The wallet is the only way into this account, so unlinking it would lock
   * the player out for good (signing in again creates a *new* account). Only a
   * *verified* email counts as another way in, matching the backend's unlink
   * guard: an unverified one can't reach password reset. (auth/me doesn't say
   * whether there's a password; legacy password accounts without a verified
   * email are treated as wallet-only, which errs on the safe side.)
   */
  walletOnly: boolean;
};

/** The signed-in player as the backend knows them, or null when signed out. */
export async function sessionUser(): Promise<SessionAccount | null> {
  const response = await backendFetch("auth/me/");
  if (response.status === 401 || response.status === 403) return null;
  const me = await readEnvelope<BackendMe>(response);
  return {
    user: toContributor({
      username: me.username,
      display_name: me.profile.display_name,
      avatar_url: me.profile.avatar_url,
    }),
    walletOnly: !(me.email && me.email_verified),
  };
}
