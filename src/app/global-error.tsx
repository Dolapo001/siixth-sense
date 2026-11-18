"use client";

import { useEffect } from "react";
import { SixthSenseSymbol } from "@/components/brand/logo";
import "./globals.css";

/**
 * Last-resort boundary: replaces the root layout when it fails, so it brings
 * its own <html> and <body>. Keep it dependency-light.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Replace with an error reporting service once one is chosen.
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <SixthSenseSymbol size={40} />
        <h1 className="text-title font-semibold">Something went wrong</h1>
        <p className="max-w-md text-body text-muted">
          Sixth Sense hit an unexpected problem. Trying again often fixes it.
        </p>
        <button
          type="button"
          onClick={retry}
          className="h-10 rounded-md bg-accent px-5 font-medium text-midnight transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
