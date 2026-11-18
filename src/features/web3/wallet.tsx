"use client";

import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { WalletReadyState, type WalletError, type WalletName } from "@solana/wallet-adapter-base";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import type { WalletControls } from "./wallet-controls";

export { isUserRejection, type WalletControls } from "./wallet-controls";

const noWallets: never[] = [];

function reportWalletError(error: WalletError) {
  // Surfaced to the user by the component that started the action.
  console.warn("Wallet:", error.name, error.message);
}

/**
 * Solana wallet context for the Web3 pages only, so the rest of the app
 * doesn't load wallet code. Wallets are discovered through the Wallet
 * Standard (no hard-coded vendors). Auto-connect is off: connecting is
 * always the user's choice.
 */
export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    // Stable props: a new wallets array each render would rebuild the adapter list.
    <WalletProvider wallets={noWallets} autoConnect={false} onError={reportWalletError}>
      {children}
    </WalletProvider>
  );
}

export function useWalletControls(): WalletControls {
  const wallet = useWallet();
  // The wallet the user just chose. A ref: the adapter already reports `connecting` for the UI.
  const pending = useRef<string | null>(null);
  const selectedName = wallet.wallet?.adapter.name ?? null;

  const connectSelected = useEffectEvent(() => {
    if (pending.current && selectedName === pending.current && !wallet.connected && !wallet.connecting) {
      pending.current = null;
      wallet.connect().catch(() => {
        // Rejections are reported through onError; staying disconnected is the right state.
      });
    }
  });

  // select() is asynchronous; connect once the chosen wallet is actually selected.
  useEffect(() => connectSelected(), [selectedName]);

  const available = useMemo(
    () =>
      wallet.wallets
        .filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
        .map((w) => ({ name: w.adapter.name, icon: w.adapter.icon })),
    [wallet.wallets],
  );

  return {
    available,
    connected: wallet.connected,
    connecting: wallet.connecting,
    walletName: wallet.wallet?.adapter.name ?? null,
    address: wallet.publicKey?.toBase58() ?? null,
    connect: (name) => {
      if (selectedName === name) {
        wallet.connect().catch(() => {
          // Reported through onError.
        });
      } else {
        pending.current = name;
        wallet.select(name as WalletName);
      }
    },
    disconnect: () => wallet.disconnect(),
    signMessage: wallet.signMessage ?? null,
  };
}
