import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocationDetail } from "@/features/world/data/gtadb.server";
import { publicPage, worldPagesIndexable } from "@/lib/seo";

/** Titles and descriptions from the place itself, e.g. "Vice Regal · Sixth Sense". */
export async function generateMetadata({ params }: PageProps<"/world/[locationId]">): Promise<Metadata> {
  const { locationId } = await params;
  const location = getLocationDetail(decodeURIComponent(locationId));
  return publicPage({
    title: location?.name ?? "Location",
    description: location
      ? `${location.description} On the GTA VI map of Leonida.`
      : "A location in the world of GTA VI, with its discoveries and verification status.",
    path: `/world/${encodeURIComponent(locationId)}`,
    // Unknown ids still render the explorer; keep them out of search.
    indexable: Boolean(location) && worldPagesIndexable,
  });
}

/**
 * Marks the route as request-time so its metadata (which reads the URL) can
 * stream. The page draws nothing: ../layout.tsx renders the explorer and
 * opens the location's panel from the URL.
 */
async function RequestTime() {
  await connection();
  return null;
}

export default function LocationPage() {
  return (
    <Suspense>
      <RequestTime />
    </Suspense>
  );
}
