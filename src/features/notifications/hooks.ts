"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/authentication/hooks";
import { useHydrated } from "@/lib/utilities/use-hydrated";
import { getNotificationsDataSource, type NotificationsDataSource } from "./data/source";

/** How often the unread badge checks for new notifications. */
const UNREAD_POLL_MS = 60_000;

export function useNotificationsSource() {
  return useQuery({ queryKey: ["notifications", "source"], queryFn: getNotificationsDataSource, staleTime: Infinity });
}

export function useNotifications(source: NotificationsDataSource, page: number, unreadOnly: boolean) {
  return useQuery({
    queryKey: ["notifications", "list", page, unreadOnly],
    queryFn: () => source.list(page, { unreadOnly }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Unread count for the nav badge: null when signed out or with no backend.
 * Polls while the tab is open and refreshes when the player comes back to it.
 */
export function useUnreadCount() {
  const hydrated = useHydrated();
  const session = useSession();
  const source = useNotificationsSource();
  const signedIn = !!session.data;
  const query = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => source.data!.unreadCount(),
    enabled: signedIn && !!source.data,
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
  return hydrated && signedIn ? (query.data ?? null) : null;
}

export function useMutedKinds(source: NotificationsDataSource) {
  return useQuery({ queryKey: ["notifications", "muted"], queryFn: () => source.getMuted() });
}

export function useNotificationActions(source: NotificationsDataSource) {
  const queryClient = useQueryClient();
  // Lists and the badge only: the cached source itself must not be rebuilt.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] }),
    ]);
  return {
    markRead: useMutation({ mutationFn: (ids: string[]) => source.markRead(ids), onSettled: refresh }),
    markAllRead: useMutation({ mutationFn: () => source.markAllRead(), onSettled: refresh }),
    setMuted: useMutation({
      mutationFn: (kinds: string[]) => source.setMuted(kinds),
      onSuccess: (muted) => queryClient.setQueryData(["notifications", "muted"], muted),
    }),
  };
}
