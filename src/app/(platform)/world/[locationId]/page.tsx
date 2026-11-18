import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";

// Titles come from location data once the backend exists; until then the URL is enough for a canonical.
export async function generateMetadata({ params }: PageProps<"/world/[locationId]">): Promise<Metadata> {
  const { locationId } = await params;
  return publicPage({
    title: "Location",
    description: "A location in the world of GTA VI, with its discoveries and verification status.",
    path: `/world/${encodeURIComponent(locationId)}`,
  });
}

// Rendered by ../layout.tsx, which reads the location id from the URL and opens its panel.
export default function LocationPage() {
  return null;
}
