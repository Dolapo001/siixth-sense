import type { Metadata } from "next";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export const metadata: Metadata = { title: "Notifications" };

// Phase 3 placeholder. Replaced in Phase 4.
export default function NotificationsPage() {
  return (
    <FeaturePlaceholder
      title="Notifications"
      description="Updates on your discoveries, verifications and rewards."
      unavailable="Notifications need sign-in, which isn't set up yet."
    />
  );
}
