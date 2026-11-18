import Link from "next/link";
import { ArrowRight, BadgeCheck, Link2, ScanSearch, Users } from "lucide-react";
import { SixthSenseLogo, SixthSenseSymbol } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { landingImages } from "@/features/landing/fixtures";
import { Reveal } from "./reveal";
import { SceneImage } from "./scene-image";
import { ContractAddress, XLink } from "./socials";
import { IllustrationTag, SectionHeading } from "./section-heading";

/** Faint coordinate geometry behind the Proof of Discovery section. */
function CoordinateField() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 700"
    >
      <defs>
        <pattern id="pod-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#273443" strokeWidth=".6" />
        </pattern>
        <radialGradient id="pod-fade" cx="70%" cy="50%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="pod-mask">
          <rect width="1200" height="700" fill="url(#pod-fade)" />
        </mask>
      </defs>
      <g mask="url(#pod-mask)">
        <rect width="1200" height="700" fill="url(#pod-grid)" opacity=".7" />
        {[90, 170, 260, 360].map((r) => (
          <circle key={r} cx="840" cy="350" r={r} fill="none" stroke="#55d6d0" strokeOpacity=".12" />
        ))}
        <path d="M840 0V700M0 350H1200" stroke="#55d6d0" strokeOpacity=".14" />
      </g>
    </svg>
  );
}

export function ProofSection() {
  const points = [
    { icon: ScanSearch, title: "Discover it", body: "Share a screenshot. Sixth Sense suggests what's in it." },
    { icon: Users, title: "Verify it", body: "The community reviews it. Only reviewers can make it verified." },
    { icon: Link2, title: "Prove it", body: "Verified discoveries can be recorded on Solana as a public attestation." },
  ];
  return (
    <section
      id="proof"
      aria-labelledby="proof-title"
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-border bg-surface"
    >
      <CoordinateField />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-24 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:py-32">
        <div className="flex flex-col gap-8">
          <SectionHeading
            id="proof-title"
            eyebrow="Proof of Discovery"
            title="Discover it. Verify it. Prove it."
            description="Verified discoveries can become blockchain-backed attestations, creating a transparent record of contributions through Solana."
          />
          <ul className="flex flex-col gap-5">
            {points.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={0.1 + i * 0.08}>
                <li className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-accent">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-body font-medium">{title}</span>
                    <span className="text-small text-muted">{body}</span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.3}>
            <Link
              href="/web3/proof"
              className={buttonStyles({ variant: "secondary", size: "lg", className: "self-start" })}
            >
              Learn about Proof of Discovery
              <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <figure className="glass-panel relative flex flex-col gap-5 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-meta tracking-wide text-muted uppercase">Attestation record</span>
              <IllustrationTag>Example</IllustrationTag>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-small">
              <dt className="text-muted">Discovery</dt>
              <dd>Flamingos in the wetlands</dd>
              <dt className="text-muted">Community status</dt>
              <dd className="flex items-center gap-1.5 text-accent">
                <BadgeCheck aria-hidden className="size-4" />
                Verified by reviewers
              </dd>
              <dt className="text-muted">Network</dt>
              <dd>Solana</dd>
              <dt className="text-muted">Signature</dt>
              <dd className="meta break-all text-fg/80">EXAMPLE·5tQ…9hVb·NOT·A·REAL·TRANSACTION</dd>
            </dl>
            <figcaption className="border-t border-white/10 pt-4 text-meta text-muted">
              An attestation proves Sixth Sense recorded the discovery through its process. Whether it&apos;s correct is
              decided by community verification.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden">
      <SceneImage image={landingImages.skylineNight} className="absolute inset-0 -z-10 h-full w-full" sizes="100vw" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-midnight via-midnight/55 to-midnight/80" />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 py-32 text-center md:py-44">
        <Reveal className="flex flex-col items-center gap-6">
          <SixthSenseSymbol size={32} />
          <h2
            id="final-title"
            className="text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.025em] text-balance md:text-[3.5rem]"
          >
            The world is waiting to be uncovered.
          </h2>
          <p className="max-w-xl text-body text-fg/75 md:text-[1.0625rem]">
            Start exploring. Upload a screenshot. Discover something new.
          </p>
          <Link
            href="/world"
            className="group mt-2 inline-flex h-12 items-center gap-3 rounded-md border border-accent/60 bg-midnight/60 pr-2 pl-6 text-body font-medium text-fg backdrop-blur transition-colors hover:border-accent hover:bg-accent hover:text-midnight"
          >
            Explore Sixth Sense
            <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-midnight transition-colors group-hover:bg-midnight group-hover:text-accent">
              <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

const footerColumns = [
  {
    title: "Explore",
    links: [
      { label: "World", href: "/world" },
      { label: "Discoveries", href: "/discoveries" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Proof of Discovery", href: "/web3/proof" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-midnight">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] md:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <SixthSenseLogo size={26} />
          <p className="eyebrow text-accent">See beyond the scene.</p>
          <p className="max-w-sm text-small text-muted">
            The visual intelligence layer for exploring the world of GTA VI, built on screenshots and verified by the
            community.
          </p>
          <XLink className="-ml-2.5" />
          <ContractAddress className="max-w-sm" />
        </div>
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <h2 className="eyebrow">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-small text-fg/75 transition-colors hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-5 py-6 text-meta text-muted md:px-8">
          Sixth Sense is an independent fan-oriented technology project. It is not affiliated with, endorsed by,
          sponsored by or officially connected to Rockstar Games or Take-Two Interactive.
        </p>
      </div>
    </footer>
  );
}
