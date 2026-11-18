"use client";

import { useUnreadCount } from "./hooks";

/** Both render nothing when signed out, with no backend, or with nothing unread. */

/** The count over the bell icon. Decorative: `UnreadLabel` carries the meaning. */
export function UnreadBadge() {
  const unread = useUnreadCount();
  if (!unread) return null;
  return (
    <span
      aria-hidden
      className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-none font-semibold text-midnight"
    >
      {unread > 9 ? "9+" : unread}
    </span>
  );
}

/** Screen-reader text; place it after the link's name ("Notifications, 3 unread"). */
export function UnreadLabel() {
  const unread = useUnreadCount();
  if (!unread) return null;
  return <span className="sr-only">, {unread} unread</span>;
}
