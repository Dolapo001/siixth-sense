import { Suspense } from "react";
import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";
import { PageContainer } from "@/components/layout/page-header";
import { LoadingState } from "@/components/shared/states";
import { CommunityHub } from "@/features/community/community-hub";

export const metadata: Metadata = publicPage({
  title: "Community",
  description: "Review discoveries, add evidence and help verify what players have found.",
  path: "/community",
});

// The active queue comes from the URL, which needs a Suspense boundary under cacheComponents.
export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState label="Loading community" />
        </PageContainer>
      }
    >
      <CommunityHub />
    </Suspense>
  );
}
