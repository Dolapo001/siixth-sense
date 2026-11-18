/*
 * Account settings from the Sixth Sense backend: me/settings/ (privacy),
 * profiles/me/email/, auth/verify-email/, auth/resend-verification/ and
 * DELETE profiles/me/ (see its apps/contract/account_views.py).
 */

import { api, ApiError } from "@/lib/api/client";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { AccountSettings, Privacy } from "../types";
import type { SettingsDataSource } from "./source";

type BackendSettings = {
  account: { username: string; email: string | null; email_verified: boolean; has_password: boolean };
  privacy: { profile_public: boolean; show_wallet: boolean; show_activity: boolean; attribute_discoveries_publicly: boolean };
};

const toBackendFlag: Record<keyof Privacy, keyof BackendSettings["privacy"]> = {
  profilePublic: "profile_public",
  showWallet: "show_wallet",
  showActivity: "show_activity",
  creditDiscoveries: "attribute_discoveries_publicly",
};

function toSettings(s: BackendSettings): AccountSettings {
  return {
    account: {
      username: s.account.username,
      email: s.account.email,
      emailVerified: s.account.email_verified,
      hasPassword: s.account.has_password,
    },
    privacy: {
      profilePublic: s.privacy.profile_public,
      showWallet: s.privacy.show_wallet,
      showActivity: s.privacy.show_activity,
      creditDiscoveries: s.privacy.attribute_discoveries_publicly,
    },
  };
}

async function action<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) throw new ActionRefusedError(error.message);
    throw error;
  }
}

export async function createApiSettingsSource(): Promise<SettingsDataSource> {
  return {
    kind: "live",

    async get() {
      try {
        return toSettings(await api<BackendSettings>("me/settings/"));
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
        throw error;
      }
    },

    setPrivacy: (change) =>
      action(async () => {
        const privacy = Object.fromEntries(
          Object.entries(change).map(([key, value]) => [toBackendFlag[key as keyof Privacy], value]),
        );
        return toSettings(await api<BackendSettings>("me/settings/", { method: "PATCH", body: { privacy } }));
      }),

    setEmail: (email) => action(async () => void (await api("profiles/me/email/", { method: "POST", body: { email } }))),

    resendVerification: () => action(async () => void (await api("auth/resend-verification/", { method: "POST", body: {} }))),

    verifyEmail: (token) => action(async () => void (await api("auth/verify-email/", { method: "POST", body: { token } }))),

    deleteAccount: (password) =>
      action(async () => {
        await api("profiles/me/", { method: "DELETE", body: password ? { confirm: "DELETE", password } : { confirm: "DELETE" } });
      }),
  };
}
