import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/shared/states";
import { WalletSignIn } from "@/features/authentication/wallet-sign-in";
import { SolanaWalletProvider } from "@/features/web3/wallet";

export const metadata: Metadata = { title: "Create account" };

// With wallet sign-in, creating an account and signing in are the same step.
export default function RegisterPage() {
  return (
    <SolanaWalletProvider>
      <Suspense fallback={<LoadingState label="Loading sign-in" pageTitle="Create your account" className="p-6" />}>
        <WalletSignIn mode="create" />
      </Suspense>
    </SolanaWalletProvider>
  );
}
