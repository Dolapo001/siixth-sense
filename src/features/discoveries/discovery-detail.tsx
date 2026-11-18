"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2, MapPin } from "lucide-react";
import { DiscoveryRow, formatDate } from "@/components/discoveries/discovery-items";
import { ScreenshotThumb } from "@/components/discoveries/screenshot-thumb";
import { VerificationTimeline } from "@/components/discoveries/verification-timeline";
import { PageContainer } from "@/components/layout/page-header";
import { ConfidenceLabel } from "@/components/shared/confidence-label";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { useDiscoveryActions } from "@/features/community/hooks";
import {
  DiscussionSection,
  EvidenceSection,
  FollowButton,
  ReportDiscoveryButton,
  SuggestionsSection,
  VerifyPanel,
} from "@/features/community/discovery-sections";
import { categoryConfig } from "@/features/world/categories";
import { locationHref } from "@/features/world/routing";
import type { DiscoveryDataSource } from "./data/source";
import { useDiscovery, useDiscoverySource } from "./hooks";
import type { DiscoveryDetail } from "./types";

function BackLink() {
  return (
    <Link href="/discoveries" className={buttonStyles({ variant: "ghost", size: "sm", className: "self-start" })}>
      <ArrowLeft aria-hidden />
      Discoveries
    </Link>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="eyebrow">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

export function DiscoveryDetailView({ id }: { id: string }) {
  const source = useDiscoverySource();
  if (source.isPending) return <DiscoveryDetailLoading />;
  if (source.isError) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => source.refetch()} headingLevel={1} />
      </PageContainer>
    );
  }
  if (!source.data) {
    return (
      <PageContainer>
        <BackLink />
        <UnavailableState headingLevel={1} description="Discovery details load from the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Loaded source={source.data} id={id} />;
}

export function DiscoveryDetailLoading() {
  return (
    <PageContainer>
      <LoadingState label="Loading discovery" pageTitle="Discovery" />
    </PageContainer>
  );
}

function Loaded({ source, id }: { source: DiscoveryDataSource; id: string }) {
  const discovery = useDiscovery(source, id);
  if (discovery.isPending) return <DiscoveryDetailLoading />;
  if (discovery.isError) {
    return (
      <PageContainer>
        <BackLink />
        <ErrorState description="This discovery didn't load." onRetry={() => discovery.refetch()} headingLevel={1} />
      </PageContainer>
    );
  }
  if (!discovery.data) {
    return (
      <PageContainer>
        <BackLink />
        <EmptyState
          headingLevel={1}
          title="Discovery not found"
          description="It may have been removed, or the link is wrong."
          action={{ label: "Browse discoveries", href: "/discoveries" }}
        />
      </PageContainer>
    );
  }
  return <Detail discovery={discovery.data} source={source} />;
}

function Detail({ discovery, source }: { discovery: DiscoveryDetail; source: DiscoveryDataSource }) {
  const { label: categoryLabel, icon: CategoryIcon } = categoryConfig[discovery.category];
  const actions = useDiscoveryActions(source, discovery.id);
  const sample = source.kind === "sample";

  return (
    <PageContainer>
      <BackLink />
      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={discovery.verification} />
          <span className="inline-flex items-center gap-1.5 text-small text-muted">
            <CategoryIcon aria-hidden className="size-4" />
            {categoryLabel}
          </span>
          {sample && <Badge tone="signal">Sample data</Badge>}
        </div>
        <h1 className="text-title font-semibold">{discovery.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-muted">
            Shared by{" "}
            <Link href={`/profile/${discovery.contributor.username}`} className="text-fg underline decoration-fg/40 underline-offset-2 hover:text-accent hover:decoration-accent">
              {discovery.contributor.displayName}
            </Link>{" "}
            on <time dateTime={discovery.submittedAt}>{formatDate(discovery.submittedAt)}</time>
          </p>
          <div className="flex gap-2">
            <FollowButton discovery={discovery} actions={actions} />
            <ReportDiscoveryButton discovery={discovery} actions={actions} />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <ScreenshotThumb screenshot={discovery.screenshot} category={discovery.category} size="lg" />
          <p className="text-body">{discovery.description}</p>

          <Section title="Detected entities" id="entities">
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {discovery.detections.map((detection) => {
                const Icon = categoryConfig[detection.category].icon;
                return (
                  <li key={detection.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Icon aria-hidden className="size-4 text-muted" />
                    <span className="min-w-0 flex-1 text-small font-medium">{detection.label}</span>
                    <ConfidenceLabel score={detection.confidence} level={detection.confidenceLevel} />
                    <VerificationBadge status={detection.verification} />
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Other identifications" id="suggestions">
            <SuggestionsSection discovery={discovery} actions={actions} />
          </Section>

          <Section title="Evidence" id="evidence">
            <EvidenceSection discovery={discovery} actions={actions} />
          </Section>

          <Section title={`Discussion · ${discovery.comments.length}`} id="discussion">
            <DiscussionSection discovery={discovery} actions={actions} />
          </Section>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Discovery context">
          <SideCard title="Community verification">
            <VerificationTimeline events={discovery.verificationHistory} />
            <div className="border-t border-border pt-3">
              <VerifyPanel discovery={discovery} actions={actions} />
            </div>
          </SideCard>

          <SideCard title="Location">
            {discovery.location ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-body font-semibold">{discovery.location.name}</p>
                  <p className="text-small text-muted">{discovery.location.regionName ?? "Region unknown"}</p>
                </div>
                <LocationPrecisionBadge precision={discovery.location.precision} className="self-start" />
                <Link
                  href={locationHref(discovery.location.locationId)}
                  className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
                >
                  <MapPin aria-hidden />
                  View on map
                </Link>
              </div>
            ) : (
              <p className="text-small text-muted">Where this was found is unknown.</p>
            )}
          </SideCard>

          <SideCard title="On-chain attestation">
            {discovery.attestation ? (
              <div className="flex flex-col gap-2">
                <p className="text-small">{discovery.attestation.network}</p>
                <p className="meta break-all text-muted">{discovery.attestation.signature}</p>
                <p className="meta text-muted">Recorded {formatDate(discovery.attestation.recordedAt)}</p>
                <a
                  href={discovery.attestation.explorerUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-small text-accent hover:underline"
                >
                  View in explorer
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            ) : (
              <p className="text-small text-muted">Not recorded on-chain.</p>
            )}
            <p className="flex gap-2 border-t border-border pt-3 text-meta text-muted">
              <Link2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              An attestation proves Sixth Sense recorded this discovery through its process. It doesn&apos;t prove the
              discovery is correct; community verification above covers that.
            </p>
          </SideCard>
        </aside>
      </div>

      {discovery.related.length > 0 && (
        <Section title="Related discoveries" id="related">
          <div className="divide-y divide-border border-y border-border">
            {discovery.related.map((item) => (
              <DiscoveryRow key={item.id} item={item} />
            ))}
          </div>
        </Section>
      )}
    </PageContainer>
  );
}
