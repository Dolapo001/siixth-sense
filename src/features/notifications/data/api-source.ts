/*
 * Notifications from the Sixth Sense backend: notifications/, unread-count/,
 * read/ and preferences/ (see its apps/notifications/views.py).
 */

import { api, ApiError, type ApiPage } from "@/lib/api/client";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import { linkFor } from "../kinds";
import type { AppNotification } from "../types";
import type { NotificationsDataSource } from "./source";

type BackendNotification = {
  public_id: string;
  kind: string;
  title: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

const signedOut = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

/** Reads: null when signed out, so pages show sign-in rather than an error. */
async function orSignedOut<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (signedOut(error)) return null;
    throw error;
  }
}

async function action<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) throw new ActionRefusedError(error.message);
    throw error;
  }
}

function toNotification(n: BackendNotification): AppNotification {
  const data = n.data ?? {};
  const note = typeof data.note === "string" && data.note ? data.note : undefined;
  return { id: n.public_id, kind: n.kind, title: n.title, read: n.read, at: n.created_at, link: linkFor(n.kind, data), note };
}

export async function createApiNotificationsSource(): Promise<NotificationsDataSource> {
  return {
    kind: "live",

    list: (page, options) =>
      orSignedOut(async () => {
        const result = await api<ApiPage<BackendNotification> & { unread_count: number }>("notifications/", {
          query: { page, unread: options?.unreadOnly ? 1 : null },
        });
        return {
          items: result.results.map(toNotification),
          total: result.count,
          page: result.page,
          pageSize: result.page_size,
          unread: result.unread_count,
        };
      }).catch((error) => {
        // Past the last page the backend answers 404; that's an empty page, not a failure.
        if (error instanceof ApiError && error.status === 404) return { items: [], total: 0, page, pageSize: 25, unread: 0 };
        throw error;
      }),

    unreadCount: () => orSignedOut(async () => (await api<{ unread: number }>("notifications/unread-count/")).unread),

    markRead: async (ids) => {
      // An empty body means "mark everything read" to the backend, so never send one.
      if (ids.length === 0) return;
      await action(() => api("notifications/read/", { method: "POST", body: { ids } }));
    },

    markAllRead: async () => {
      await action(() => api("notifications/read/", { method: "POST", body: { all: true } }));
    },

    getMuted: () => orSignedOut(async () => (await api<{ muted: string[] }>("notifications/preferences/")).muted),

    setMuted: (kinds) =>
      action(async () => (await api<{ muted: string[] }>("notifications/preferences/", { method: "PUT", body: { muted: kinds } })).muted),
  };
}
