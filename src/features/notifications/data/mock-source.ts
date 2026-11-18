/*
 * ⚠ DEVELOPMENT SAMPLE SERVICE — sample notifications for the sample viewer.
 *
 * Mirrors the backend: kinds and wording come from its notify() calls, links
 * point at the sample discoveries, and muting a kind stops new ones of that
 * kind (existing ones stay). The UI labels everything here as sample data.
 */

import { getSession } from "@/features/authentication/session";
import { __sample } from "@/features/discoveries/data/mock-source";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import { linkFor } from "../kinds";
import type { AppNotification } from "../types";
import type { NotificationsDataSource } from "./source";

const PAGE_SIZE = 25;
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

type Stored = Omit<AppNotification, "link"> & { data: Record<string, unknown> };

let muted: string[] = [];
let store: Stored[] | null = null;

function seed(): Stored[] {
  const [a, b, c] = __sample.items;
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const rows: Omit<Stored, "id">[] = [
    { kind: "comment_received", title: `New comment on "${a.title}"`, read: false, at: hoursAgo(1), data: { discovery: a.id } },
    { kind: "discovery_verified", title: `Your discovery "${b.title}" is now verified`, read: false, at: hoursAgo(5), data: { discovery: b.id } },
    { kind: "proof_confirmed", title: "Proof of Discovery confirmed", read: false, at: hoursAgo(5.5), data: { discovery: b.id } },
    { kind: "follow", title: "sample_member started following you", read: true, at: hoursAgo(26), data: { username: "sample_member" } },
    { kind: "suggestion", title: `New identification suggestion on "${c.title}"`, read: true, at: hoursAgo(50), data: { discovery: c.id } },
    { kind: "analysis_completed", title: "Your screenshot analysis is ready", read: true, at: hoursAgo(72), data: { analysis: "sample" } },
    { kind: "role_promoted", title: "You are now a Verified Contributor", read: true, at: hoursAgo(120), data: {} },
  ];
  return rows.map((row, index) => ({ ...row, id: `sample-notification-${index + 1}` }));
}

const all = () => (store ??= seed());
const present = ({ data, ...n }: Stored): AppNotification => ({ ...n, link: linkFor(n.kind, data) });

async function signedIn() {
  return (await getSession()) !== null;
}

/** Test hook: start from the seeded inbox with nothing muted. */
export function __resetSampleNotifications() {
  store = null;
  muted = [];
}

/** Adds a notification the way the backend's notify() does: muted kinds are dropped. */
export function __notifySample(kind: string, title: string, data: Record<string, unknown> = {}) {
  if (muted.includes(kind)) return;
  all().unshift({ id: `sample-notification-${Date.now()}`, kind, title, read: false, at: new Date().toISOString(), data });
}

export function createMockNotificationsSource(): NotificationsDataSource {
  return {
    kind: "sample",

    async list(page, options) {
      if (!(await signedIn())) return null;
      await delay();
      const rows = all().filter((n) => !options?.unreadOnly || !n.read);
      const start = (page - 1) * PAGE_SIZE;
      return {
        items: rows.slice(start, start + PAGE_SIZE).map(present),
        total: rows.length,
        page,
        pageSize: PAGE_SIZE,
        unread: all().filter((n) => !n.read).length,
      };
    },

    async unreadCount() {
      if (!(await signedIn())) return null;
      return all().filter((n) => !n.read).length;
    },

    async markRead(ids) {
      if (!(await signedIn())) throw new ActionRefusedError("Sign in to manage notifications.");
      await delay();
      for (const n of all()) if (ids.includes(n.id)) n.read = true;
    },

    async markAllRead() {
      if (!(await signedIn())) throw new ActionRefusedError("Sign in to manage notifications.");
      await delay();
      for (const n of all()) n.read = true;
    },

    async getMuted() {
      if (!(await signedIn())) return null;
      return [...muted];
    },

    async setMuted(kinds) {
      if (!(await signedIn())) throw new ActionRefusedError("Sign in to change notification settings.");
      await delay();
      muted = [...new Set(kinds)].sort();
      return [...muted];
    },
  };
}
