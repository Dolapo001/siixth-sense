import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { NotificationsPage } from "../types";

/** In-app notifications for the signed-in player. Reads return null when signed out. */
export interface NotificationsDataSource {
  readonly kind: "sample" | "live";
  list(page: number, options?: { unreadOnly?: boolean }): Promise<NotificationsPage | null>;
  unreadCount(): Promise<number | null>;
  /** Marks exactly these as read. Never "everything" by accident: see markAllRead. */
  markRead(ids: string[]): Promise<void>;
  markAllRead(): Promise<void>;
  /** Kinds the player has muted; null when signed out. */
  getMuted(): Promise<string[] | null>;
  setMuted(kinds: string[]): Promise<string[]>;
}

export async function getNotificationsDataSource(): Promise<NotificationsDataSource | null> {
  if (liveApiEnabled()) {
    const { createApiNotificationsSource } = await import("./api-source");
    return createApiNotificationsSource();
  }
  if (devMocksEnabled()) {
    const { createMockNotificationsSource } = await import("./mock-source");
    return createMockNotificationsSource();
  }
  return null;
}
