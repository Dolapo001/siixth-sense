/** Where a notification takes the player, when there is somewhere useful to go. */
export type NotificationLink = { href: string; label: string };

/** One in-app notification. `kind` is an open set: the server may add kinds. */
export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  read: boolean;
  at: string;
  link: NotificationLink | null;
  /** A moderator's own words, for warnings. */
  note?: string;
};

export type NotificationsPage = {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  /** Unread across all pages, not just this one. */
  unread: number;
};

/** A set of kinds the player can mute together. */
export type MuteGroup = { id: string; label: string; description: string; kinds: string[] };
