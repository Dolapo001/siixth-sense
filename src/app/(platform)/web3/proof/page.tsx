import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/shared/states";
import { ProofOfDiscovery } from "@/features/web3/proof-view";

export const metadata: Metadata = { title: "Proof of Discovery" };

// The page number comes from the URL, which needs a Suspense boundary under cacheComponents.
export default function ProofPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading attestations" />}>
      <ProofOfDiscovery />
    </Suspense>
  );
}
