"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import bs58 from "bs58";
import { actionErrorMessage } from "@/features/community/hooks";
import { getWeb3DataSource, type Web3DataSource } from "./data/source";
import { isUserRejection, type WalletControls } from "./wallet-controls";

export function useWeb3Source() {
  return useQuery({ queryKey: ["web3", "source"], queryFn: getWeb3DataSource, staleTime: Infinity });
}

export function useLinkedWallet(source: Web3DataSource) {
  return useQuery({ queryKey: ["web3", "linked"], queryFn: () => source.getLinkedWallet() });
}

export function useWalletTransactions(source: Web3DataSource, enabled: boolean) {
  return useQuery({
    queryKey: ["web3", "transactions"],
    queryFn: () => source.listWalletTransactions(),
    enabled,
  });
}

export function useAttestations(source: Web3DataSource, page: number) {
  return useQuery({
    queryKey: ["web3", "attestations", page],
    queryFn: () => source.listAttestations(page),
    placeholderData: keepPreviousData,
  });
}

export function useRewards(source: Web3DataSource) {
  return useQuery({ queryKey: ["web3", "rewards"], queryFn: () => source.getRewards() });
}

export type LinkStep = "idle" | "requesting" | "signing" | "verifying" | "done" | "error";

/**
 * Proves wallet ownership: get a one-time message from Sixth Sense, have the
 * wallet sign it, let Sixth Sense check the signature. Never a transaction.
 */
export function useLinkWallet(source: Web3DataSource, controls: WalletControls) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<LinkStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["web3"] }),
      queryClient.invalidateQueries({ queryKey: ["profiles"] }),
    ]);

  const link = async () => {
    const { address, signMessage } = controls;
    if (!address || !signMessage) return;
    setError(null);
    try {
      setStep("requesting");
      const challenge = await source.createChallenge(address);
      setMessage(challenge.message);
      setStep("signing");
      const signature = await signMessage(new TextEncoder().encode(challenge.message));
      setStep("verifying");
      await source.linkWallet(address, challenge, bs58.encode(signature));
      setStep("done");
      await refresh();
    } catch (e) {
      setStep("error");
      setError(isUserRejection(e) ? "You cancelled the signature request. Nothing was linked." : actionErrorMessage(e));
    }
  };

  const unlink = async () => {
    setError(null);
    try {
      await source.unlinkWallet();
      setStep("idle");
      setMessage(null);
      await refresh();
    } catch (e) {
      setError(actionErrorMessage(e));
    }
  };

  return { step, error, message, link, unlink };
}
