import { Suspense } from "react";
import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";
import { DiscoveryDetailLoading, DiscoveryDetailView } from "@/features/discoveries/discovery-detail";

// Titles come from discovery data once the backend exists; until then the URL is enough for a canonical.
export async function generateMetadata({ params }: PageProps<"/discoveries/[discoveryId]">): Promise<Metadata> {
  const { discoveryId } = await params;
  return publicPage({
    title: "Discovery",
    description: "A discovery from a gameplay screenshot, with its evidence, verification history and discussion.",
    path: `/discoveries/${encodeURIComponent(discoveryId)}`,
  });
}

async function DiscoveryLoader({ params }: { params: PageProps<"/discoveries/[discoveryId]">["params"] }) {
  const { discoveryId } = await params;
  return <DiscoveryDetailView id={discoveryId} />;
}

// The id is only known at request time, so it's read inside Suspense (cacheComponents).
export default function DiscoveryPage({ params }: PageProps<"/discoveries/[discoveryId]">) {
  return (
    <Suspense fallback={<DiscoveryDetailLoading />}>
      <DiscoveryLoader params={params} />
    </Suspense>
  );
}
