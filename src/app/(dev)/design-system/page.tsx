import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandLoader, BrandReveal, SignalMark } from "@/components/brand/brand-motion";
import { SixthSenseLogo, SixthSenseSymbol, SixthSenseWordmark } from "@/components/brand/logo";
import { ConfidenceLabel } from "@/components/shared/confidence-label";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { locationPrecisions, verificationStatuses } from "@/types/intelligence";
import { InteractiveExamples } from "./interactive-examples";
import { Section } from "./section";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const colors = [
  ["midnight", "#0B1018", "Background"],
  ["accent", "#55D6D0", "Electric Cyan"],
  ["fg", "#F2F4F5", "Off-white"],
  ["muted", "#8995A5", "Steel Grey"],
  ["signal", "#F29B52", "Signal Orange"],
  ["surface", "#111A25", "Surface"],
  ["surface-elevated", "#172331", "Surface Elevated"],
  ["border", "#273443", "Border"],
] as const;

const swatch: Record<(typeof colors)[number][0], string> = {
  midnight: "bg-midnight",
  accent: "bg-accent",
  fg: "bg-fg",
  muted: "bg-muted",
  signal: "bg-signal",
  surface: "bg-surface",
  "surface-elevated": "bg-surface-elevated",
  border: "bg-border",
};

/** Dev-only reference for every Phase 2 primitive. Returns 404 in production. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-3">
        <SixthSenseLogo />
        <h1 className="text-title font-semibold">Design system</h1>
        <p className="text-body text-muted">Phase 2 foundation. Development only.</p>
      </header>

      <Section title="Brand">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end gap-8">
            {[16, 24, 32, 48, 96].map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <SixthSenseSymbol size={size} />
                <span className="meta text-muted">{size}px</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-8">
            <SixthSenseSymbol size={48} tone="white" title="Sixth Sense symbol, white" />
            <span className="rounded-md bg-white p-2">
              <SixthSenseSymbol size={48} tone="black" title="Sixth Sense symbol, black" />
            </span>
            <SixthSenseLogo symbolOnly size={32} />
          </div>
          <div className="flex flex-wrap items-center gap-10">
            <SixthSenseLogo size={40} />
            <SixthSenseLogo size={28} tone="light" />
            <span className="rounded-md bg-white px-4 py-3">
              <SixthSenseLogo size={28} tone="dark" />
            </span>
            <SixthSenseWordmark height={16} />
          </div>
          <div className="flex flex-wrap items-center gap-12">
            <SixthSenseLogo size={48} layout="stacked" tagline />
            <BrandReveal size={44} withWordmark />
            <BrandLoader size={40} label="Loading example" />
            <SignalMark size={28} />
          </div>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colors.map(([token, hex, name]) => (
            <div key={token} className="flex flex-col gap-2">
              <div className={`h-16 rounded-md border border-border ${swatch[token]}`} />
              <div className="text-small">{name}</div>
              <div className="meta text-muted">
                {token} · {hex}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-4">
          <p className="text-display font-bold">See Beyond the Scene.</p>
          <p className="text-title font-semibold">Page title</p>
          <p className="text-heading font-semibold">Section heading</p>
          <p className="max-w-prose text-body">
            Body text. Turn gameplay screenshots into intelligence. Identify what you see, uncover discoveries and
            explore the world through a community-powered visual network.
          </p>
          <p className="text-small text-muted">Small secondary text.</p>
          <p className="meta text-muted">X 1024.50 · Y −312.75 · 2026-11-17 20:41 UTC · ID 7f3a9c</p>
          <p className="eyebrow">Eyebrow label</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="warning">Dispute</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="signal">Signal</Badge>
          <Badge tone="tentative">Tentative</Badge>
        </div>
      </Section>

      <Section title="Verification status">
        <div className="flex flex-wrap gap-3">
          {verificationStatuses.map((status) => (
            <VerificationBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Confidence">
        <div className="flex flex-col gap-3">
          <ConfidenceLabel score={0.91} />
          <ConfidenceLabel score={0.64} />
          <ConfidenceLabel score={0.22} />
          <ConfidenceLabel level="moderate" />
        </div>
      </Section>

      <Section title="Location precision">
        <div className="flex flex-wrap gap-3">
          {locationPrecisions.map((precision) => (
            <LocationPrecisionBadge key={precision} precision={precision} />
          ))}
        </div>
      </Section>

      <InteractiveExamples />
    </main>
  );
}
