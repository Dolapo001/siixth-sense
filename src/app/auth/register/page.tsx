import type { Metadata } from "next";
import { UnavailableState } from "@/components/shared/states";

export const metadata: Metadata = { title: "Create account" };

// Placeholder until the auth method is decided (see docs/phase-1-assessment.md).
export default function RegisterPage() {
  return (
    <UnavailableState
      headingLevel={1}
      title="Create account"
      description="Account creation isn't set up yet. The authentication method hasn't been decided."
      action={{ label: "Continue without signing in", href: "/world" }}
      className="py-10"
    />
  );
}
