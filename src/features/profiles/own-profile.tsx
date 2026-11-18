"use client";

import { PageContainer } from "@/components/layout/page-header";
import { LoadingState, PermissionDeniedState } from "@/components/shared/states";
import { useSession } from "@/features/authentication/hooks";
import { ProfileView } from "./profile-view";

/** `/profile`: the signed-in viewer's own profile. */
export function OwnProfile() {
  const session = useSession();
  if (session.isPending) {
    return (
      <PageContainer>
        <LoadingState label="Loading your profile" pageTitle="Your profile" />
      </PageContainer>
    );
  }
  if (!session.data) {
    return (
      <PageContainer>
        <PermissionDeniedState
          headingLevel={1}
          title="Sign in to see your profile"
          description="Your profile shows your discoveries, reviews and reputation once you're signed in."
          action={{ label: "Sign in", href: "/auth/login" }}
        />
      </PageContainer>
    );
  }
  return <ProfileView username={session.data.user.username} />;
}
