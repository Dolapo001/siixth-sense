import { backendFetch } from "@/lib/api/backend.server";
import { readEnvelope } from "@/lib/api/client";
import { toContributor } from "@/lib/api/mappers";
import type { Contributor } from "@/features/discoveries/types";

export type BackendMe = {
  username: string;
  email: string | null;
  role: string;
  profile: { display_name: string; avatar_url: string };
};

export type SessionAccount = {
  user: Contributor;
  /**
   * The wallet is the only way into this account: it has no email, so
   * unlinking the wallet would lock the player out for good (signing in again
   * creates a *new* account). Sign-in is wallet-only, so this is true for
   * everyone who hasn't added an email.
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
    walletOnly: !me.email,
  };
}
