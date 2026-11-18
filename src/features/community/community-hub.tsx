"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserRound } from "lucide-react";
import { SignInPrompt } from "@/components/community/action-bits";
import { VerificationGuide } from "@/components/community/verification-guide";
import { DiscoveryRow } from "@/components/discoveries/discovery-items";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { useSession } from "@/features/authentication/hooks";
import type { DiscoveryDataSource } from "@/features/discoveries/data/source";
import { useDiscoveries, useDiscoverySource } from "@/features/discoveries/hooks";
import { defaultQuery, serializeDiscoveryQuery, type DiscoveryQuery } from "@/features/discoveries/query";
import { cn } from "@/lib/utilities/cn";

export const queues = [
  {
    key: "review",
    label: "Needs review",
    description: "Waiting for reviewers. Oldest first, so nothing waits forever.",
    query: { ...defaultQuery, verification: "awaiting_verification", sort: "oldest" },
  },
  {
    key: "disputed",
    label: "Disputed",
    description: "Reviewers disagree. Fresh evidence helps settle these.",
    query: { ...defaultQuery, verification: "disputed", sort: "discussed" },
  },
  {
    key: "suggested",
    label: "AI suggested",
    description: "Not checked by anyone yet. Confirm or dispute to start a review.",
    query: { ...defaultQuery, verification: "ai_suggested", sort: "newest" },
  },
] as const satisfies readonly { key: string; label: string; description: string; query: DiscoveryQuery }[];

export function queueFromParam(value: string | null) {
  return queues.find((queue) => queue.key === value) ?? queues[0];
}

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Verification network"
      title="Community"
      description="Sixth Sense's identifications are suggestions until people check them. Review discoveries, add evidence and settle disputes."
      actions={
        sample ? (
          <Badge tone="signal" className="self-start">
            Sample data
          </Badge>
        ) : undefined
      }
    />
  );
}

export function CommunityHub() {
  const source = useDiscoverySource();
  if (source.isPending) {
    return (
      <PageContainer>
        <Header sample={false} />
        <LoadingState label="Loading community" />
      </PageContainer>
    );
  }
  if (source.isError) {
    return (
      <PageContainer>
        <Header sample={false} />
        <ErrorState onRetry={() => source.refetch()} />
      </PageContainer>
    );
  }
  if (!source.data) {
    return (
      <PageContainer>
        <Header sample={false} />
        <UnavailableState description="Community features need the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Hub source={source.data} />;
}

function Hub({ source }: { source: DiscoveryDataSource }) {
  const searchParams = useSearchParams();
  const active = queueFromParam(searchParams.get("queue"));
  const list = useDiscoveries(source, active.query);
  const session = useSession();

  return (
    <PageContainer>
      <Header sample={source.kind === "sample"} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="queue-heading" className="flex flex-col gap-4">
          <h2 id="queue-heading" className="sr-only">
            Review queues
          </h2>
          <nav
            aria-label="Review queues"
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none]"
          >
            {queues.map((queue) => {
              const current = queue.key === active.key;
              return (
                <Link
                  key={queue.key}
                  href={queue.key === queues[0].key ? "/community" : `/community?queue=${queue.key}`}
                  aria-current={current ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "-mb-px shrink-0 border-b-2 px-3 py-2 text-small font-medium transition-colors",
                    current ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
                  )}
                >
                  {queue.label}
                </Link>
              );
            })}
          </nav>
          <p className="text-small text-muted">{active.description}</p>

          {list.isPending ? (
            <LoadingState label={`Loading ${active.label}`} />
          ) : list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.data.total === 0 ? (
            <EmptyState
              title="Nothing in this queue"
              description="Everything here has been handled. Check another queue."
            />
          ) : (
            <>
              <p className="meta text-muted">{list.data.total} in queue</p>
              <div className="divide-y divide-border border-y border-border">
                {list.data.items.map((item) => (
                  <DiscoveryRow key={item.id} item={item} />
                ))}
              </div>
              {list.data.total > list.data.items.length && (
                <Link
                  href={`/discoveries?${serializeDiscoveryQuery({ ...active.query, page: 2 })}`}
                  className={buttonStyles({ variant: "secondary", className: "self-start" })}
                >
                  See more in Discoveries
                </Link>
              )}
            </>
          )}
        </section>

        <aside className="flex flex-col gap-4" aria-label="About verification">
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="eyebrow">You</h2>
            {session.data ? (
              <p className="flex items-center gap-2 text-small">
                <UserRound aria-hidden className="size-4 text-muted" />
                Signed in as {session.data.user.displayName}
              </p>
            ) : session.isPending ? null : (
              <SignInPrompt action="review discoveries" />
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="eyebrow">What the statuses mean</h2>
            <VerificationGuide />
          </section>
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <h2 className="eyebrow">Good reviewing</h2>
            <ul className="list-disc pl-5 text-small text-muted">
              <li>Confirm only what you can see in the screenshot.</li>
              <li>When you dispute, say why so others can check.</li>
              <li>Add evidence: a reference image or a clear description.</li>
              <li>Report spam, abuse or misleading posts.</li>
            </ul>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
