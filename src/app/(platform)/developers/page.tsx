import type { Metadata } from "next";
import { DeveloperPortal } from "@/features/developers/developer-portal";
import { loadApiSpec } from "@/features/developers/load-spec";

export const metadata: Metadata = {
  title: "Developer Portal",
  description: "Sixth Sense API reference, authentication and error documentation.",
  // Public documentation: indexable, unlike the rest of the platform.
  robots: { index: true, follow: true },
  alternates: { canonical: "/developers" },
};

export default async function DevelopersPage() {
  return <DeveloperPortal spec={await loadApiSpec()} />;
}
