import { Suspense } from "react";
import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";
import { PageContainer } from "@/components/layout/page-header";
import { LoadingState } from "@/components/shared/states";
import { DiscoveryFeed } from "@/features/discoveries/discovery-feed";

export const metadata: Metadata = publicPage({
  title: "Discoveries",
  description:
    "Browse vehicles, landmarks, wildlife and hidden details found in gameplay screenshots, with their verification status.",
  path: "/discoveries",
});

// The feed reads filters from the URL, which needs a Suspense boundary under cacheComponents.
export default function DiscoveriesPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState label="Loading discoveries" />
        </PageContainer>
      }
    >
      <DiscoveryFeed />
    </Suspense>
  );
}
