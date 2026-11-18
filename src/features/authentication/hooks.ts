"use client";

import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/lib/utilities/use-hydrated";
import { getSession } from "./session";

/**
 * Who is signed in. Reads as pending until the calling component has
 * hydrated, exactly like the server render (which never knows the session):
 * the rail asks for the session early, so by the time a page's own boundary
 * hydrates the answer is often cached, and rendering it straight away would
 * make that boundary's markup differ from the server's.
 */
export function useSession() {
  const hydrated = useHydrated();
  const query = useQuery({ queryKey: ["session"], queryFn: getSession, staleTime: Infinity });
  if (hydrated) return query;
  return {
    ...query,
    data: undefined,
    error: null,
    status: "pending",
    isPending: true,
    isSuccess: false,
    isError: false,
  } as unknown as typeof query;
}
