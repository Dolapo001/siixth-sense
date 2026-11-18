import type { Metadata } from "next";
import { UnavailableState } from "@/components/shared/states";

export const metadata: Metadata = { title: "Signing in" };

// Placeholder until the auth method is decided (see docs/phase-1-assessment.md).
export default function CallbackPage() {
  return (
    <UnavailableState
      headingLevel={1}
      title="Signing in"
      description="There's no sign-in provider connected yet, so there's nothing to complete here."
      action={{ label: "Continue without signing in", href: "/world" }}
      className="py-10"
    />
  );
}
