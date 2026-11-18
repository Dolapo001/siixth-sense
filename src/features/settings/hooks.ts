"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingsDataSource, type SettingsDataSource } from "./data/source";
import type { Privacy } from "./types";

export function useSettingsSource() {
  return useQuery({ queryKey: ["settings", "source"], queryFn: getSettingsDataSource, staleTime: Infinity });
}

export function useAccountSettings(source: SettingsDataSource) {
  return useQuery({ queryKey: ["settings", "account"], queryFn: () => source.get() });
}

export function useSettingsActions(source: SettingsDataSource) {
  const queryClient = useQueryClient();
  const refreshAccount = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["settings", "account"] }),
      // walletOnly (which hides "Unlink wallet") depends on having a verified email.
      queryClient.invalidateQueries({ queryKey: ["session"] }),
    ]);

  return {
    setPrivacy: useMutation({
      mutationFn: (change: Partial<Privacy>) => source.setPrivacy(change),
      onSuccess: (settings) => {
        queryClient.setQueryData(["settings", "account"], settings);
        // Profiles show (or hide) the wallet and activity these flags control.
        return queryClient.invalidateQueries({ queryKey: ["profiles"] });
      },
    }),
    setEmail: useMutation({ mutationFn: (email: string) => source.setEmail(email), onSuccess: refreshAccount }),
    resendVerification: useMutation({ mutationFn: () => source.resendVerification() }),
    deleteAccount: useMutation({ mutationFn: (password?: string) => source.deleteAccount(password) }),
  };
}
