import type { Metadata } from "next";
import { publicPage, worldPagesIndexable } from "@/lib/seo";

export const metadata: Metadata = publicPage({
  title: "World",
  description: "Explore an interactive map of discoveries, locations and community reports across the world of GTA VI.",
  path: "/world",
  indexable: worldPagesIndexable,
});

// The World Explorer is rendered by ./layout.tsx so the map persists across selections.
export default function WorldPage() {
  return null;
}
