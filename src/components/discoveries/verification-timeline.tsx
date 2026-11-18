import Link from "next/link";
import { VerificationBadge } from "@/components/shared/verification-badge";
import type { VerificationEvent } from "@/features/discoveries/types";
import { formatDate } from "./discovery-items";

/** How a discovery's status changed over time, and who changed it. */
export function VerificationTimeline({ events }: { events: VerificationEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative flex flex-col gap-1.5">
          <span
            aria-hidden
            className={
              index === events.length - 1
                ? "absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-accent"
                : "absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border border-muted bg-midnight"
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={event.status} />
            <time dateTime={event.at} className="meta text-muted">
              {formatDate(event.at)}
            </time>
          </div>
          <p className="text-small text-muted">
            {event.actor.kind === "ai" ? (
              "Sixth Sense analysis"
            ) : (
              <Link href={`/profile/${event.actor.username}`} className="text-fg underline decoration-fg/40 underline-offset-2 hover:text-accent hover:decoration-accent">
                @{event.actor.username}
              </Link>
            )}
            {event.note && <> · {event.note}</>}
          </p>
        </li>
      ))}
    </ol>
  );
}
