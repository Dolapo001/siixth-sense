import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { NetworkBadge } from "@/features/web3/network-badge";
import { ActiveWeb3Tabs, Web3Tabs } from "@/features/web3/web3-tabs";
import { SolanaWalletProvider } from "@/features/web3/wallet";

/** Wallet code loads only on the Web3 pages. */
export default function Web3Layout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <PageContainer>
        <PageHeader
          eyebrow="Optional"
          title="Wallet"
          description="Link a Solana wallet to receive attestations and rewards. Not required for anything else."
          actions={<NetworkBadge />}
        />
        <Suspense fallback={<Web3Tabs pathname={null} />}>
          <ActiveWeb3Tabs />
        </Suspense>
        {children}
      </PageContainer>
    </SolanaWalletProvider>
  );
}
