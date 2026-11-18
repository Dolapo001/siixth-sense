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

/** The signed-in player as the backend knows them, or null when signed out. */
export async function sessionUser(): Promise<Contributor | null> {
  const response = await backendFetch("auth/me/");
  if (response.status === 401 || response.status === 403) return null;
  const me = await readEnvelope<BackendMe>(response);
  return toContributor({ username: me.username, display_name: me.profile.display_name, avatar_url: me.profile.avatar_url });
}
