"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActionRefusedError, type DiscoveryDataSource } from "@/features/discoveries/data/source";
import type { ReportReason, ReportTarget, Vote } from "@/features/discoveries/types";

/** A message safe to show: the server's refusal reason, or a generic network message. */
export function actionErrorMessage(error: unknown) {
  return error instanceof ActionRefusedError
    ? error.message
    : "That didn't go through. Check your connection and try again.";
}

/** Awaits an action; true on success. Failures surface through the mutation's error state. */
export async function succeeded(action: Promise<unknown>) {
  try {
    await action;
    return true;
  } catch {
    return false;
  }
}

/**
 * Community actions on one discovery. After each one the discovery is
 * refetched, so the page shows exactly what the server now has.
 */
export function useDiscoveryActions(source: DiscoveryDataSource, discoveryId: string) {
  const queryClient = useQueryClient();
  const detailKey = ["discoveries", "detail", discoveryId];
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: detailKey }),
      // Status and counts show in the feed too.
      queryClient.invalidateQueries({ queryKey: ["discoveries", "list"] }),
    ]);

  return {
    comment: useMutation({
      mutationFn: (body: string) => source.addComment(discoveryId, body),
      onSuccess: refresh,
    }),
    suggest: useMutation({
      mutationFn: (input: Parameters<DiscoveryDataSource["suggestIdentification"]>[1]) =>
        source.suggestIdentification(discoveryId, input),
      onSuccess: refresh,
    }),
    addEvidence: useMutation({
      mutationFn: (input: { text: string; url?: string }) => source.addEvidence(discoveryId, input),
      onSuccess: refresh,
    }),
    vote: useMutation({
      mutationFn: ({ vote, reason }: { vote: Vote; reason?: string }) => source.vote(discoveryId, vote, reason),
      // The server returns the updated discovery; use it directly, then refresh lists.
      onSuccess: (detail) => {
        queryClient.setQueryData(detailKey, detail);
        return queryClient.invalidateQueries({ queryKey: ["discoveries", "list"] });
      },
    }),
    report: useMutation({
      mutationFn: ({ target, reason, details }: { target: ReportTarget; reason: ReportReason; details?: string }) =>
        source.report(target, reason, details),
    }),
    follow: useMutation({
      mutationFn: ({ username, following }: { username: string; following: boolean }) =>
        source.setFollowing(username, following),
      onSuccess: refresh,
    }),
  };
}
