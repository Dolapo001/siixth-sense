"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState, PermissionDeniedState, UnavailableState } from "@/components/shared/states";
import { ActionError } from "@/components/community/action-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actionErrorMessage } from "@/features/community/hooks";
import { cn } from "@/lib/utilities/cn";
import type { NotificationsDataSource } from "./data/source";
import { useMutedKinds, useNotificationActions, useNotifications, useNotificationsSource } from "./hooks";
import { isGroupMuted, muteGroups, withGroupMuted } from "./kinds";
import type { AppNotification, NotificationsPage } from "./types";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Account"
      title="Notifications"
      description="Updates on your discoveries, verifications and rewards."
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

export function NotificationsView() {
  const source = useNotificationsSource();
  if (source.isPending || source.isError || !source.data) {
    return (
      <PageContainer>
        <Header sample={false} />
        {source.isPending ? (
          <LoadingState label="Loading notifications" />
        ) : source.isError ? (
          <ErrorState onRetry={() => source.refetch()} />
        ) : (
          <UnavailableState description="Notifications come from the Sixth Sense backend, which isn't connected yet." />
        )}
      </PageContainer>
    );
  }
  return <Loaded source={source.data} />;
}

function Loaded({ source }: { source: NotificationsDataSource }) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useNotifications(source, page, unreadOnly);

  const show = (unread: boolean) => {
    setUnreadOnly(unread);
    setPage(1);
  };

  return (
    <PageContainer>
      <Header sample={source.kind === "sample"} />
      {list.isPending ? (
        <LoadingState label="Loading notifications" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <PermissionDeniedState
          title="Sign in to see your notifications"
          description="Notifications are about your own discoveries, votes and rewards."
          action={{ label: "Sign in", href: "/auth/login?next=%2Fnotifications" }}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Inbox
            source={source}
            data={list.data}
            unreadOnly={unreadOnly}
            onShow={show}
            onPage={setPage}
            busy={list.isFetching}
          />
          <MuteSettings source={source} />
        </div>
      )}
    </PageContainer>
  );
}

function Inbox({
  source,
  data,
  unreadOnly,
  onShow,
  onPage,
  busy,
}: {
  source: NotificationsDataSource;
  data: NotificationsPage;
  unreadOnly: boolean;
  onShow: (unread: boolean) => void;
  onPage: (page: number) => void;
  busy: boolean;
}) {
  const actions = useNotificationActions(source);
  const failed = actions.markRead.error ?? actions.markAllRead.error;
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section aria-labelledby="inbox-heading" className="flex flex-col gap-4">
      <h2 id="inbox-heading" className="sr-only">
        Inbox
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="flex gap-1 rounded-md border border-border p-1">
          {[
            { label: "All", unread: false },
            { label: `Unread (${data.unread})`, unread: true },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              aria-pressed={unreadOnly === tab.unread}
              onClick={() => onShow(tab.unread)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-small font-medium transition-colors",
                unreadOnly === tab.unread ? "bg-accent/10 text-accent" : "text-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={data.unread === 0}
          loading={actions.markAllRead.isPending}
          onClick={() => actions.markAllRead.mutate()}
        >
          <CheckCheck aria-hidden />
          Mark all as read
        </Button>
      </div>

      <ActionError message={failed ? actionErrorMessage(failed) : null} />

      {data.items.length === 0 ? (
        unreadOnly ? (
          <EmptyState title="You're all caught up" description="No unread notifications." />
        ) : (
          <EmptyState
            title="No notifications yet"
            description="You'll hear here when someone comments on, verifies or suggests something for your discoveries."
            action={{ label: "Analyze a screenshot", href: "/analyze" }}
          />
        )
      ) : (
        <ul aria-busy={busy} className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {data.items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              marking={actions.markRead.isPending && actions.markRead.variables?.includes(n.id)}
              onRead={() => actions.markRead.mutate([n.id])}
            />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <nav aria-label="Notification pages" className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
            <ChevronLeft aria-hidden />
            Newer
          </Button>
          <span className="text-meta text-muted">
            Page {data.page} of {lastPage}
          </span>
          <Button variant="ghost" size="sm" disabled={data.page >= lastPage} onClick={() => onPage(data.page + 1)}>
            Older
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}
    </section>
  );
}

function NotificationRow({
  notification: n,
  marking,
  onRead,
}: {
  notification: AppNotification;
  marking: boolean | undefined;
  onRead: () => void;
}) {
  return (
    <li className={cn("flex items-start gap-3 p-4", !n.read && "bg-accent/5")}>
      <span
        aria-hidden
        className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("text-body", n.read ? "text-muted" : "font-medium text-fg")}>
          {!n.read && <span className="sr-only">Unread: </span>}
          {n.title}
        </p>
        {n.note && <blockquote className="border-l-2 border-border pl-3 text-small text-muted">{n.note}</blockquote>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <time dateTime={n.at} className="text-meta text-muted">
            {when.format(new Date(n.at))}
          </time>
          {n.link && (
            <Link
              href={n.link.href}
              onClick={() => {
                if (!n.read) onRead();
              }}
              className="text-meta text-accent underline underline-offset-2 hover:decoration-2"
            >
              {n.link.label}
            </Link>
          )}
        </div>
      </div>
      {!n.read && (
        <Button variant="ghost" size="sm" loading={marking} onClick={onRead} className="shrink-0">
          <Check aria-hidden />
          <span className="sr-only sm:not-sr-only">Mark as read</span>
        </Button>
      )}
    </li>
  );
}

function MuteSettings({ source }: { source: NotificationsDataSource }) {
  const muted = useMutedKinds(source);
  const { setMuted } = useNotificationActions(source);

  return (
    <section aria-labelledby="mute-heading" className="flex flex-col gap-4 self-start rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 id="mute-heading" className="flex items-center gap-2 text-heading font-semibold">
          <BellOff aria-hidden className="size-4" />
          What to tell you about
        </h2>
        <p className="text-small text-muted">
          Switching one off stops new notifications of that kind. Moderator messages and report outcomes always come through.
        </p>
      </div>
      {muted.isPending ? (
        <LoadingState label="Loading notification settings" className="gap-2" />
      ) : muted.isError || !muted.data ? (
        <ErrorState onRetry={() => muted.refetch()} className="py-4" />
      ) : (
        <MuteGroups muted={muted.data} busy={setMuted.isPending} onChange={(kinds) => setMuted.mutate(kinds)} />
      )}
      <ActionError message={setMuted.error ? actionErrorMessage(setMuted.error) : null} />
    </section>
  );
}

function MuteGroups({ muted, busy, onChange }: { muted: string[]; busy: boolean; onChange: (kinds: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={busy}>
      <legend className="sr-only">Notify me about</legend>
      {muteGroups.map((group) => (
        <label key={group.id} className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={!isGroupMuted(group, muted)}
            onChange={(event) => onChange(withGroupMuted(muted, group, !event.target.checked))}
          />
          <span className="flex flex-col">
            <span className="text-small font-medium text-fg">{group.label}</span>
            <span className="text-meta text-muted">{group.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
