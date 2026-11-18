import { Suspense } from "react";
import type { Metadata } from "next";
import { ProfileLoading } from "@/features/profiles/profile-view";
import { OwnProfile } from "@/features/profiles/own-profile";

export const metadata: Metadata = { title: "Your profile" };

// The profile reads its tab from the URL, which needs a Suspense boundary under cacheComponents.
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <OwnProfile />
    </Suspense>
  );
}
