import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ProofSection, FinalCta } from "@/components/landing/closing-sections";
import { CommunityPreview } from "@/components/landing/community-preview";
import { DiscoveryGallery } from "@/components/landing/discovery-gallery";
import { Hero } from "@/components/landing/hero";
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview";
import { MapPreview } from "@/components/landing/map-preview";
import { getPreviewPlaces, getPreviewTiles, PREVIEW_ASPECT } from "@/features/landing/leonida-preview.server";
import { Reveal } from "@/components/landing/reveal";
import { ScannerShowcase } from "@/components/landing/scanner-section";
import { SectionHeading } from "@/components/landing/section-heading";
import { buttonStyles } from "@/components/ui/button";

const title = "Sixth Sense — See beyond the scene.";
const description =
  "Turn gameplay screenshots into intelligence. Identify what you see, uncover discoveries and explore the world through a community-powered visual network.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, type: "website", siteName: "Sixth Sense" },
  twitter: { card: "summary_large_image", title, description },
};

/** Structured data for search engines. Only facts the page itself states. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sixth Sense",
  slogan: "See beyond the scene.",
  description,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Web",
};

function Section({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-20 ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 md:px-8">{children}</div>
    </section>
  );
}

/*
 * Landing page. Static and server-rendered; only the animated and
 * interactive pieces (scanner, map, community demo, nav) are client components.
 * All demo content comes from src/features/landing/fixtures.ts.
 */
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static object defined above; nothing user-supplied.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Hero />

      <Section id="how-it-works" className="py-20 md:py-28">
        <SectionHeading
          id="how-it-works-title"
          eyebrow="Intelligence starts with a screenshot"
          title="One screenshot. A world of discoveries."
          description="Every image contains details worth exploring. Sixth Sense helps identify the objects, places and hidden elements that make the world unique."
        />
        <ScannerShowcase />
      </Section>

      <Section id="explore" className="py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="explore-title"
            eyebrow="Explore Leonida"
            title="Every corner has a story."
            description="From Vice Beach hotels to Port Gellhorn and the Keys: thousands of places mapped by the GTA VI community, each linked to what's known about it."
          />
          <Reveal delay={0.1}>
            <Link href="/world" className={buttonStyles({ size: "lg" })}>
              Explore the World
              <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>
        <Reveal>
          <MapPreview places={getPreviewPlaces()} tiles={getPreviewTiles()} aspect={PREVIEW_ASPECT} />
        </Reveal>
      </Section>

      <Section id="discoveries" className="py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="discoveries-title"
            eyebrow="Discoveries"
            title="The details make the world."
            description="Explore vehicles, landmarks, wildlife and hidden discoveries through a growing visual knowledge network."
          />
          <Reveal delay={0.1}>
            <Link href="/discoveries" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              Browse discoveries
              <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>
        <DiscoveryGallery />
      </Section>

      <Section id="community" className="py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="community-title"
            eyebrow="Community intelligence"
            title="The community sees more together."
            description="Discoveries become more valuable when players investigate, contribute evidence and verify what they find together."
          />
          <Reveal delay={0.1}>
            <Link href="/community" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              Explore Community
              <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>
        <CommunityPreview />
      </Section>

      <Section id="leaderboard" className="py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="leaderboard-title"
            eyebrow="Leaderboard"
            title="Recognition is earned, not claimed."
            description="Contributors rank by what the community has confirmed: verified discoveries, the reviews they give and the reputation that builds from both."
          />
          <Reveal delay={0.1}>
            <Link href="/leaderboard" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              View Leaderboard
              <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>
        <LeaderboardPreview />
      </Section>

      <ProofSection />
      <FinalCta />
    </>
  );
}
