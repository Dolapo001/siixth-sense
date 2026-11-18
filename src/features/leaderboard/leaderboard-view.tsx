"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/profiles/avatar";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/features/authentication/hooks";
import type { ProfileDataSource } from "@/features/profiles/data/source";
import { useLeaderboard, useProfileSource } from "@/features/profiles/hooks";
import {
  leaderboardDimensions,
  leaderboardPeriods,
  type LeaderboardDimension,
  type LeaderboardPeriod,
} from "@/features/profiles/types";
import { cn } from "@/lib/utilities/cn";

export function parseLeaderboardParams(params: URLSearchParams) {
  const by = params.get("by");
  const period = params.get("period");
  return {
    dimension: (leaderboardDimensions.some((d) => d.value === by) ? by : "verified") as LeaderboardDimension,
    period: (leaderboardPeriods.some((p) => p.value === period) ? period : "month") as LeaderboardPeriod,
  };
}

function hrefFor(dimension: LeaderboardDimension, period: LeaderboardPeriod) {
  const params = new URLSearchParams();
  if (dimension !== "verified") params.set("by", dimension);
  if (period !== "month") params.set("period", period);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Contributors"
      title="Leaderboard"
      description="Recognising contributions the community has checked. Rankings never count uploads alone."
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

export function LeaderboardView() {
  const source = useProfileSource();
  if (source.isPending) {
    return (
      <PageContainer>
        <Header sample={false} />
        <LoadingState label="Loading leaderboard" />
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
        <UnavailableState description="Rankings come from the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Board source={source.data} />;
}

function Board({ source }: { source: ProfileDataSource }) {
  const searchParams = useSearchParams();
  const { dimension, period } = parseLeaderboardParams(new URLSearchParams(searchParams.toString()));
  const board = useLeaderboard(source, { dimension, period });
  const session = useSession();
  const dimensionLabel = leaderboardDimensions.find((d) => d.value === dimension)!.label;
  const periods = board.data?.supportedPeriods ?? leaderboardPeriods.map((p) => p.value);

  return (
    <PageContainer>
      <Header sample={source.kind === "sample"} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <nav aria-label="Rank by" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {leaderboardDimensions.map((d) => (
            <Link
              key={d.value}
              href={hrefFor(d.value, period)}
              scroll={false}
              aria-current={d.value === dimension ? "page" : undefined}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-small font-medium",
                d.value === dimension ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
              )}
            >
              {d.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Time period" className="flex gap-1 rounded-md border border-border p-1">
          {leaderboardPeriods
            .filter((p) => periods.includes(p.value))
            .map((p) => (
              <Link
                key={p.value}
                href={hrefFor(dimension, p.value)}
                scroll={false}
                aria-current={p.value === period ? "page" : undefined}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-small pointer-coarse:py-2.5",
                  p.value === period ? "bg-surface-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {p.label}
              </Link>
            ))}
        </nav>
      </div>

      {board.isPending ? (
        <LoadingState label="Loading leaderboard" />
      ) : board.isError ? (
        <ErrorState onRetry={() => board.refetch()} />
      ) : board.data.entries.length === 0 ? (
        <EmptyState
          title="No one ranked yet"
          description="Nobody has contributions of this kind in this period. Try a longer period."
          action={{ label: "All time", href: hrefFor(dimension, "all") }}
        />
      ) : (
        <div className={cn("overflow-x-auto transition-opacity", board.isPlaceholderData && "opacity-80")} aria-busy={board.isPlaceholderData}>
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <caption className="sr-only">
              Contributors ranked by {dimensionLabel.toLowerCase()},{" "}
              {leaderboardPeriods.find((p) => p.value === period)!.label.toLowerCase()}
            </caption>
            <thead>
              <tr className="border-b border-border text-meta text-muted">
                <th scope="col" className="w-16 py-2 pr-3 font-normal">
                  Rank
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  Contributor
                </th>
                {leaderboardDimensions.map((d) => (
                  <th
                    key={d.value}
                    scope="col"
                    aria-sort={d.value === dimension ? "descending" : undefined}
                    className={cn("py-2 pr-3 text-right font-normal", d.value === dimension && "text-fg")}
                  >
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.data.entries.map((entry) => {
                const isYou = session.data?.user.username === entry.username;
                return (
                  <tr
                    key={entry.username}
                    className={cn("border-b border-border", isYou && "bg-accent/5")}
                    aria-current={isYou ? "true" : undefined}
                  >
                    <td className="py-3 pr-3">
                      <span className={cn("meta", entry.rank <= 3 ? "text-fg" : "text-muted")}>#{entry.rank}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <Link href={`/profile/${entry.username}`} className="flex items-center gap-3 hover:text-accent">
                        <Avatar name={entry.displayName} preset={entry.avatarId} size="sm" />
                        <span className="text-small font-medium">{entry.displayName}</span>
                        {isYou && <Badge tone="accent">You</Badge>}
                      </Link>
                    </td>
                    {leaderboardDimensions.map((d) => (
                      <td
                        key={d.value}
                        className={cn(
                          "meta py-3 pr-3 text-right",
                          d.value === dimension ? "text-small font-semibold text-fg" : "text-muted",
                        )}
                      >
                        {entry[d.value].toLocaleString("en-US")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-start gap-2 text-small text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Verified discoveries count only after community reviewers confirm them. Reputation is calculated by Sixth Sense,
        weighted toward verified work; uploads on their own don&apos;t earn a ranking.
      </p>
    </PageContainer>
  );
}
