"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * False during server rendering and while this component hydrates; true after.
 *
 * Use it to keep client-only data (anything React Query may already hold) out
 * of a component's first client render. Boundaries hydrate at different
 * times, so a query one boundary started can already be cached when a later
 * one hydrates; rendering it then makes the markup differ from the server's
 * and React throws the tree away.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
