"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";

/** Errors in the landing and auth areas (the platform has its own boundary). */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Replace with an error reporting service once one is chosen.
    console.error(error);
  }, [error]);

  return (
    <main id="content" className="flex flex-1 items-center justify-center px-4 py-24">
      <ErrorState headingLevel={1} description="This page hit an unexpected problem. Trying again often fixes it." onRetry={retry} />
    </main>
  );
}
