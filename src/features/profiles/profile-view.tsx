"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Award, CalendarDays, Wallet } from "lucide-react";
import { DiscoveryRow, formatDate } from "@/components/discoveries/discovery-items";
import { PageContainer } from "@/components/layout/page-header";
import { Avatar } from "@/components/profiles/avatar";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { useSession } from "@/features/authentication/hooks";
import type { DiscoveryDataSource } from "@/features/discoveries/data/source";
import { useDiscoveries, useDiscoverySource } from "@/features/discoveries/hooks";
import { defaultQuery, serializeDiscoveryQuery } from "@/features/discoveries/query";
import { cn } from "@/lib/utilities/cn";
import type { ProfileDataSource } from "./data/source";
import { useProfile, useProfileSource } from "./hooks";
import type { Profile } from "./types";
import { CopyableValue } from "@/components/web3/web3-bits";

export function ProfileView({ username }: { username: string }) {
  const source = useProfileSource();
  if (source.isPending) return <ProfileLoading />;
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
        <UnavailableState headingLevel={1} description="Profiles load from the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Loaded source={source.data} username={username} />;
}

export function ProfileLoading() {
  return (
    <PageContainer>
      <LoadingState label="Loading profile" pageTitle="Contributor profile" />
    </PageContainer>
  );
}

function Loaded({ source, username }: { source: ProfileDataSource; username: string }) {
  const profile = useProfile(source, username);
  if (profile.isPending) return <ProfileLoading />;
  if (profile.isError) {
    return (
      <PageContainer>
        <ErrorState description="This profile didn't load." onRetry={() => profile.refetch()} headingLevel={1} />
      </PageContainer>
    );
  }
  if (!profile.data) {
    return (
      <PageContainer>
        <EmptyState
          headingLevel={1}
          title="Contributor not found"
          description={`There's no contributor called @${username}.`}
          action={{ label: "See the leaderboard", href: "/leaderboard" }}
        />
      </PageContainer>
    );
  }
  return <ProfileContent profile={profile.data} sample={source.kind === "sample"} />;
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-md border p-4", emphasis ? "border-accent/40" : "border-border")}>
      <dt className="text-meta text-muted">{label}</dt>
      <dd className={cn("text-title font-semibold", emphasis && "text-accent")}>{value.toLocaleString("en-US")}</dd>
    </div>
  );
}

function WalletLine({ wallet }: { wallet: NonNullable<Profile["wallet"]> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-small text-muted">
      <Wallet aria-hidden className="size-4" />
      {/* Full address reachable by keyboard, touch and screen readers, not only a hover title. */}
      <CopyableValue value={wallet.address} label="Wallet address" />
      {wallet.verified ? <Badge tone="accent">Wallet verified</Badge> : <Badge tone="tentative">Not verified</Badge>}
    </span>
  );
}

function ProfileContent({ profile, sample }: { profile: Profile; sample: boolean }) {
  const session = useSession();
  const isYou = session.data?.user.username === profile.username;

  return (
    <PageContainer>
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title font-semibold">{profile.displayName}</h1>
            {isYou && <Badge tone="accent">You</Badge>}
            {sample && <Badge tone="signal">Sample data</Badge>}
          </div>
          <p className="meta text-muted">@{profile.username}</p>
          {profile.bio && <p className="text-body text-muted">{profile.bio}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-small text-muted">
              <CalendarDays aria-hidden className="size-4" />
              Joined <time dateTime={profile.joinedAt}>{formatDate(profile.joinedAt)}</time>
            </span>
            {profile.wallet && <WalletLine wallet={profile.wallet} />}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface px-5 py-4 sm:items-end">
          <span className="eyebrow">Reputation</span>
          <span className="text-display leading-none font-bold">{profile.reputation.toLocaleString("en-US")}</span>
          <span className="text-meta text-muted">Earned mostly from verified work</span>
        </div>
      </header>

      <section aria-labelledby="contributions" className="flex flex-col gap-3">
        <h2 id="contributions" className="eyebrow">
          Contributions
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Verified discoveries" value={profile.stats.verified} emphasis />
          <Stat label="Submitted" value={profile.stats.submitted} />
          <Stat label="Reviews" value={profile.stats.reviews} />
          <Stat label="Comments" value={profile.stats.comments} />
          <Stat label="Regions explored" value={profile.regionsExplored} />
        </dl>
        <p className="text-small text-muted">
          {profile.stats.submitted === 0
            ? "No discoveries submitted yet."
            : `${profile.stats.verified} of ${profile.stats.submitted} submitted ${profile.stats.submitted === 1 ? "discovery has" : "discoveries have"} been verified by the community.`}
        </p>
      </section>

      <section aria-labelledby="achievements" className="flex flex-col gap-3">
        <h2 id="achievements" className="eyebrow">
          Achievements
        </h2>
        {profile.achievements.length === 0 ? (
          <p className="text-small text-muted">No achievements yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.achievements.map((achievement) => (
              <li
                key={achievement.id}
                className="flex items-start gap-3 rounded-md border border-border bg-surface p-4"
              >
                <Award aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-small font-semibold">{achievement.name}</p>
                  <p className="text-meta text-muted">{achievement.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProfileDiscoveries username={profile.username} />
    </PageContainer>
  );
}

const tabs = [
  { key: "submitted", label: "Submitted" },
  { key: "verified", label: "Verified" },
] as const;

/** Submitted and verified discoveries are kept apart so one isn't mistaken for the other. */
function ProfileDiscoveries({ username }: { username: string }) {
  const source = useDiscoverySource();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "verified" ? "verified" : "submitted";

  return (
    <section aria-labelledby="profile-discoveries" className="flex flex-col gap-4">
      <h2 id="profile-discoveries" className="eyebrow">
        Discoveries
      </h2>
      <nav aria-label="Discovery lists" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "submitted" ? pathname : `${pathname}?tab=${t.key}`}
            scroll={false}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-small font-medium",
              tab === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {source.data ? (
        <DiscoveryList source={source.data} username={username} verifiedOnly={tab === "verified"} />
      ) : source.isPending ? (
        <LoadingState label="Loading discoveries" />
      ) : (
        <p className="text-small text-muted">Discoveries aren&apos;t available right now.</p>
      )}
    </section>
  );
}

function DiscoveryList({
  source,
  username,
  verifiedOnly,
}: {
  source: DiscoveryDataSource;
  username: string;
  verifiedOnly: boolean;
}) {
  const query = { ...defaultQuery, contributor: username, verification: verifiedOnly ? ("verified" as const) : null };
  const list = useDiscoveries(source, query);
  if (list.isPending) return <LoadingState label="Loading discoveries" />;
  if (list.isError) return <ErrorState onRetry={() => list.refetch()} />;
  if (list.data.total === 0) {
    return (
      <EmptyState
        title={verifiedOnly ? "No verified discoveries yet" : "No discoveries yet"}
        description={
          verifiedOnly
            ? "Discoveries appear here once community reviewers verify them."
            : "Discoveries they share will appear here."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="divide-y divide-border border-y border-border">
        {list.data.items.map((item) => (
          <DiscoveryRow key={item.id} item={item} />
        ))}
      </div>
      {list.data.total > list.data.items.length && (
        <Link
          href={`/discoveries?${serializeDiscoveryQuery(query)}`}
          className={buttonStyles({ variant: "secondary", className: "self-start" })}
        >
          See all {list.data.total} in Discoveries
        </Link>
      )}
    </div>
  );
}
