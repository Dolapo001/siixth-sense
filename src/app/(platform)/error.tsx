"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/states";

export default function PlatformError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Replace with an error reporting service once one is chosen.
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <ErrorState
        headingLevel={1}
        description="This page hit an unexpected problem. Trying again often fixes it."
        onRetry={retry}
      />
    </PageContainer>
  );
}
