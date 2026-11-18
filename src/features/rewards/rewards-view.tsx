"use client";

import Link from "next/link";
import { CircleCheck, Clock, CircleSlash, Hourglass, type LucideIcon } from "lucide-react";
import { formatDate } from "@/components/discoveries/discovery-items";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState, PermissionDeniedState, UnavailableState } from "@/components/shared/states";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CopyableValue, ExplorerLink } from "@/components/web3/web3-bits";
import type { Web3DataSource } from "@/features/web3/data/source";
import { useLinkedWallet, useRewards, useWeb3Source } from "@/features/web3/hooks";
import type { RewardActivityStatus, RewardPayout, Rewards } from "@/features/web3/types";

const activityStatus: Record<RewardActivityStatus, { label: string; icon: LucideIcon; tone: BadgeTone }> = {
  eligible: { label: "Eligible", icon: CircleCheck, tone: "accent" },
  pending_payout: { label: "Payout pending", icon: Hourglass, tone: "neutral" },
  paid: { label: "Paid", icon: CircleCheck, tone: "accent" },
  not_eligible: { label: "Not eligible", icon: CircleSlash, tone: "neutral" },
};

const payoutStatus: Record<RewardPayout["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "neutral" },
  completed: { label: "Completed", tone: "accent" },
  failed: { label: "Failed", tone: "signal" },
};

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Contributions"
      title="Rewards"
      description="Rewards follow verified work. Uploading on its own never earns anything."
      actions={
        sample ? (
          <Badge tone="signal" className="self-start">
            Sample data · devnet
          </Badge>
        ) : undefined
      }
    />
  );
}

export function RewardsView() {
  const source = useWeb3Source();
  if (source.isPending) {
    return (
      <PageContainer>
        <Header sample={false} />
        <LoadingState label="Loading rewards" />
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
        <UnavailableState description="Rewards come from the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Loaded source={source.data} />;
}

function Loaded({ source }: { source: Web3DataSource }) {
  const rewards = useRewards(source);
  return (
    <PageContainer>
      <Header sample={source.kind === "sample"} />
      {rewards.isPending ? (
        <LoadingState label="Loading rewards" />
      ) : rewards.isError ? (
        <ErrorState onRetry={() => rewards.refetch()} />
      ) : !rewards.data ? (
        <PermissionDeniedState
          title="Sign in to see your rewards"
          description="Rewards are tied to your account and your verified discoveries."
          action={{ label: "Sign in", href: "/auth/login" }}
        />
      ) : (
        <RewardsContent rewards={rewards.data} source={source} />
      )}
    </PageContainer>
  );
}

function RewardsContent({ rewards, source }: { rewards: Rewards; source: Web3DataSource }) {
  const linked = useLinkedWallet(source);
  const amount = (n: number) => `${n.toLocaleString("en-US")} ${rewards.unit}`;

  return (
    <>
      <section aria-labelledby="summary" className="flex flex-col gap-3">
        <h2 id="summary" className="eyebrow">
          Summary
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-md border border-border p-4">
            <dt className="flex items-center gap-1.5 text-meta text-muted">
              <Clock aria-hidden className="size-3.5" />
              Pending
            </dt>
            <dd className="text-title font-semibold">{amount(rewards.summary.pending)}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-accent/40 p-4">
            <dt className="flex items-center gap-1.5 text-meta text-muted">
              <CircleCheck aria-hidden className="size-3.5" />
              Paid out
            </dt>
            <dd className="text-title font-semibold text-accent">{amount(rewards.summary.completed)}</dd>
          </div>
        </dl>
        {linked.isSuccess && !linked.data && (
          <p className="text-small text-muted">
            Payouts need a verified wallet.{" "}
            <Link href="/web3" className="text-accent underline underline-offset-2 hover:decoration-2">
              Link one
            </Link>{" "}
            whenever you like. Until then, rewards wait for you.
          </p>
        )}
      </section>

      <section aria-labelledby="requirements" className="flex flex-col gap-3">
        <h2 id="requirements" className="eyebrow">
          How eligibility works
        </h2>
        <ul className="list-disc pl-5 text-small text-muted">
          {rewards.requirements.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="activity" className="flex flex-col gap-3">
        <h2 id="activity" className="eyebrow">
          Your discoveries
        </h2>
        {rewards.activity.length === 0 ? (
          <p className="text-small text-muted">
            You haven&apos;t shared any discoveries yet.{" "}
            <Link href="/analyze" className="text-accent underline underline-offset-2 hover:decoration-2">
              Analyze a screenshot
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {rewards.activity.map((item) => {
              const { label, icon: Icon, tone } = activityStatus[item.status];
              return (
                <li key={item.discoveryId} className="flex flex-wrap items-center gap-3 py-3">
                  <Link
                    href={`/discoveries/${item.discoveryId}`}
                    className="min-w-0 flex-1 truncate text-small hover:text-accent"
                  >
                    {item.discoveryTitle}
                  </Link>
                  {item.amount !== undefined && <span className="meta text-muted">{amount(item.amount)}</span>}
                  <Badge tone={tone}>
                    <Icon aria-hidden />
                    {label}
                  </Badge>
                  {item.reason && <p className="w-full text-meta text-muted">{item.reason}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="eyebrow">
          Payout history
        </h2>
        {rewards.history.length === 0 ? (
          <p className="text-small text-muted">No payouts yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {rewards.history.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="text-small font-medium">{amount(payout.amount)}</span>
                <Badge tone={payoutStatus[payout.status].tone}>{payoutStatus[payout.status].label}</Badge>
                <time dateTime={payout.at} className="meta text-muted">
                  {formatDate(payout.at)}
                </time>
                {payout.transaction ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <CopyableValue value={payout.transaction.signature} label="transaction signature" />
                    <ExplorerLink href={payout.transaction.explorerUrl} />
                  </span>
                ) : (
                  <span className="text-meta text-muted">No transaction yet</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
