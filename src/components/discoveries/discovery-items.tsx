import Link from "next/link";
import { CircleCheck, MapPin, MessageSquare } from "lucide-react";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { categoryConfig } from "@/features/world/categories";
import type { DiscoveryListItem } from "@/features/discoveries/types";
import { ScreenshotThumb } from "./screenshot-thumb";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

function LocationLine({ item }: { item: DiscoveryListItem }) {
  if (!item.location) return <span>Location unknown</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <MapPin aria-hidden className="size-3" />
      {item.location.regionName ?? item.location.name}
    </span>
  );
}

function Engagement({ item }: { item: DiscoveryListItem }) {
  return (
    <span className="inline-flex items-center gap-3 text-meta text-muted">
      <span className="inline-flex items-center gap-1">
        <MessageSquare aria-hidden className="size-3.5" />
        {item.engagement.comments}
        <span className="sr-only"> comments</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <CircleCheck aria-hidden className="size-3.5" />
        {item.engagement.confirmations}
        <span className="sr-only"> confirmations</span>
      </span>
    </span>
  );
}

/** The lead story at the top of the first page. */
export function DiscoveryLead({ item }: { item: DiscoveryListItem }) {
  const { label, icon: Icon } = categoryConfig[item.category];
  return (
    <article className="group relative grid gap-5 rounded-lg border border-border bg-surface p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:p-5">
      <ScreenshotThumb screenshot={item.screenshot} category={item.category} size="lg" />
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Latest discovery</p>
        <h2 className="text-title font-semibold">
          <Link href={`/discoveries/${item.id}`} className="after:absolute after:inset-0 group-hover:text-accent">
            {item.title}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={item.verification} />
          <span className="inline-flex items-center gap-1.5 text-small text-muted">
            <Icon aria-hidden className="size-4" />
            {label}
          </span>
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-small text-muted">
          <LocationLine item={item} />
          <span>by {item.contributor.displayName}</span>
          <time dateTime={item.submittedAt}>{formatDate(item.submittedAt)}</time>
        </p>
        <div className="mt-auto">
          <Engagement item={item} />
        </div>
      </div>
    </article>
  );
}

/** One line of the dated ledger below the lead. The whole row is the link target. */
export function DiscoveryRow({ item }: { item: DiscoveryListItem }) {
  const { label, icon: Icon } = categoryConfig[item.category];
  // Responds to the width of the list it's in (container query), not the viewport,
  // so it also fits narrow columns like the community queue.
  return (
    <article className="@container">
      <div className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-4 @2xl:grid-cols-[5.5rem_9rem_minmax(0,1fr)_auto] @2xl:items-center">
        <time dateTime={item.submittedAt} className="meta hidden text-muted @2xl:block">
          {formatDate(item.submittedAt)}
        </time>
        <ScreenshotThumb screenshot={item.screenshot} category={item.category} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="truncate text-body font-semibold">
            <Link href={`/discoveries/${item.id}`} className="after:absolute after:inset-0 group-hover:text-accent">
              {item.title}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon aria-hidden className="size-3" />
              {label}
            </span>
            <LocationLine item={item} />
            <span>{item.contributor.displayName}</span>
            <time dateTime={item.submittedAt} className="@2xl:hidden">
              {formatDate(item.submittedAt)}
            </time>
          </p>
          <div className="flex flex-wrap items-center gap-3 @2xl:hidden">
            <VerificationBadge status={item.verification} />
            <Engagement item={item} />
          </div>
        </div>
        <div className="hidden flex-col items-end gap-2 @2xl:flex">
          <VerificationBadge status={item.verification} />
          <Engagement item={item} />
        </div>
      </div>
    </article>
  );
}
