import { Suspense } from "react";
import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";
import { ProfileLoading, ProfileView } from "@/features/profiles/profile-view";

export async function generateMetadata({ params }: PageProps<"/profile/[username]">): Promise<Metadata> {
  const { username } = await params;
  return publicPage({
    title: "Contributor",
    description: "A Sixth Sense contributor's verified discoveries, reviews and reputation.",
    path: `/profile/${encodeURIComponent(username)}`,
  });
}

async function ProfileLoader({ params }: { params: PageProps<"/profile/[username]">["params"] }) {
  const { username } = await params;
  return <ProfileView username={username} />;
}

// The username is only known at request time, so it's read inside Suspense (cacheComponents).
export default function ContributorPage({ params }: PageProps<"/profile/[username]">) {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileLoader params={params} />
    </Suspense>
  );
}
