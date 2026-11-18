import { Suspense } from "react";
import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";
import { PageContainer } from "@/components/layout/page-header";
import { LoadingState } from "@/components/shared/states";
import { LeaderboardView } from "@/features/leaderboard/leaderboard-view";

export const metadata: Metadata = publicPage({
  title: "Leaderboard",
  description: "Top contributors ranked by verified discoveries, verification activity and reputation.",
  path: "/leaderboard",
});

// Ranking options come from the URL, which needs a Suspense boundary under cacheComponents.
export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState label="Loading leaderboard" />
        </PageContainer>
      }
    >
      <LeaderboardView />
    </Suspense>
  );
}
