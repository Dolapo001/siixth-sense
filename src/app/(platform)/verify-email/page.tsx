import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-header";
import { LoadingState } from "@/components/shared/states";
import { VerifyEmailView } from "@/features/settings/verify-email-view";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Verify your email", robots: noIndex };

// The token arrives in the URL, which needs a Suspense boundary under cacheComponents.
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState label="Verifying your email" />
        </PageContainer>
      }
    >
      <VerifyEmailView />
    </Suspense>
  );
}
