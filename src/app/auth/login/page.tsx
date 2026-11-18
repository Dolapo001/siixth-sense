import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/shared/states";
import { WalletSignIn } from "@/features/authentication/wallet-sign-in";
import { SolanaWalletProvider } from "@/features/web3/wallet";

export const metadata: Metadata = { title: "Sign in" };

// Sign-In With Solana. The return path comes from ?next=, read inside Suspense (cacheComponents).
export default function LoginPage() {
  return (
    <SolanaWalletProvider>
      <Suspense fallback={<LoadingState label="Loading sign-in" pageTitle="Sign in" className="p-6" />}>
        <WalletSignIn mode="sign-in" />
      </Suspense>
    </SolanaWalletProvider>
  );
}
