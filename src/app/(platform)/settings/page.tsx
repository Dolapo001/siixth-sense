import type { Metadata } from "next";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export const metadata: Metadata = { title: "Settings" };

// Phase 3 placeholder. Replaced in Phase 4.
export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Settings"
      description="Account, privacy and display preferences."
      unavailable="Account settings need sign-in, which isn't set up yet."
    />
  );
}
