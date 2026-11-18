/*
 * ⚠ DEVELOPMENT SAMPLE SERVICE — account settings for the sample viewer.
 *
 * Mirrors the backend's rules: a new email starts unverified, verifying needs
 * the emailed token (here any token from the last "email" sent), and deleting
 * the account needs the password when there is one. Nothing is emailed.
 */

import { getSession } from "@/features/authentication/session";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { AccountSettings } from "../types";
import type { SettingsDataSource } from "./source";

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initial = (): AccountSettings => ({
  account: { username: "sample_viewer", email: null, emailVerified: false, hasPassword: false },
  privacy: { profilePublic: true, showWallet: false, showActivity: false, creditDiscoveries: true },
});

let state = initial();
let deleted = false;
/** The token the last sample "verification email" carried. */
let sentToken: string | null = null;

/** Test hooks. */
export function __resetSampleSettings() {
  state = initial();
  deleted = false;
  sentToken = null;
}
export const __lastSampleVerificationToken = () => sentToken;

async function requireAccount() {
  if (deleted || !(await getSession())) throw new ActionRefusedError("Sign in to change your settings.");
}

const copy = (): AccountSettings => structuredClone(state);

export function createMockSettingsSource(): SettingsDataSource {
  return {
    kind: "sample",

    async get() {
      if (deleted || !(await getSession())) return null;
      await delay();
      return copy();
    },

    async setPrivacy(change) {
      await requireAccount();
      await delay();
      state.privacy = { ...state.privacy, ...change };
      return copy();
    },

    async setEmail(email) {
      await requireAccount();
      if (!EMAIL.test(email.trim())) throw new ActionRefusedError("Enter a valid email.");
      await delay();
      state.account = { ...state.account, email: email.trim().toLowerCase(), emailVerified: false };
      sentToken = `sample-${Date.now()}`;
    },

    async resendVerification() {
      await requireAccount();
      if (!state.account.email) throw new ActionRefusedError("Add an email first.");
      if (state.account.emailVerified) throw new ActionRefusedError("Email already verified.");
      await delay();
      sentToken = `sample-${Date.now()}`;
    },

    async verifyEmail(token) {
      await delay();
      if (!sentToken || token !== sentToken) throw new ActionRefusedError("Invalid or expired token.");
      state.account.emailVerified = true;
    },

    async deleteAccount(password) {
      await requireAccount();
      if (state.account.hasPassword && !password) throw new ActionRefusedError("Password is incorrect.");
      await delay();
      deleted = true;
    },
  };
}
