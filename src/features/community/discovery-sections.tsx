"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Flag, Lightbulb, Plus, UserCheck, UserPlus } from "lucide-react";
import { ActionError, SignInPrompt } from "@/components/community/action-bits";
import { CommentForm } from "@/components/community/comment-form";
import { AddEvidenceDialog, ReportDialog, SuggestIdentificationDialog } from "@/components/community/community-dialogs";
import { VotePanel } from "@/components/community/vote-panel";
import { formatDate } from "@/components/discoveries/discovery-items";
import { Button } from "@/components/ui/button";
import type { DiscoveryDetail, ReportTarget } from "@/features/discoveries/types";
import { categoryConfig } from "@/features/world/categories";
import { actionErrorMessage, type useDiscoveryActions } from "./hooks";
import { Avatar } from "@/components/profiles/avatar";
import type { Contributor } from "@/features/discoveries/types";

type Actions = ReturnType<typeof useDiscoveryActions>;
type SectionProps = { discovery: DiscoveryDetail; actions: Actions };

const errorOf = (mutation: { error: unknown }) => (mutation.error ? actionErrorMessage(mutation.error) : null);

/** Evidence links come from other users: only render http(s), never javascript:, data: and the like. */
function isWebUrl(url: string) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function AuthorLink({ username, displayName, avatarId }: Contributor) {
  return (
    <Link
      href={`/profile/${username}`}
      className="inline-flex items-center gap-1.5 text-fg underline decoration-fg/40 underline-offset-2 hover:text-accent hover:decoration-accent"
    >
      <Avatar name={displayName} preset={avatarId} size="xs" />
      {displayName}
    </Link>
  );
}

export function VerifyPanel({ discovery, actions }: SectionProps) {
  return (
    <VotePanel
      viewer={discovery.viewer}
      onVote={(vote, reason) => actions.vote.mutateAsync({ vote, reason })}
      pending={actions.vote.isPending}
      error={errorOf(actions.vote)}
    />
  );
}

export function EvidenceSection({ discovery, actions }: SectionProps) {
  const [open, setOpen] = useState(false);
  const viewer = discovery.viewer;
  return (
    <div className="flex flex-col gap-3">
      {discovery.evidence.length === 0 ? (
        <p className="text-small text-muted">No supporting evidence has been added yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {discovery.evidence.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 border-l border-border pl-4">
              <p className="text-meta text-muted">
                {item.author ? <AuthorLink {...item.author} /> : "Sixth Sense analysis"} ·{" "}
                <time dateTime={item.at}>{formatDate(item.at)}</time>
              </p>
              <p className="text-small">{item.text}</p>
              {item.url && isWebUrl(item.url) && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener nofollow ugc"
                  className="inline-flex items-center gap-1 self-start text-meta text-accent hover:underline"
                >
                  Source
                  <ExternalLink aria-hidden className="size-3" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {!viewer ? (
        <SignInPrompt action="add evidence" />
      ) : (
        viewer.canAddEvidence && (
          <>
            <Button variant="secondary" size="sm" className="self-start" onClick={() => setOpen(true)}>
              <Plus aria-hidden />
              Add evidence
            </Button>
            <AddEvidenceDialog
              open={open}
              onOpenChange={setOpen}
              onSubmit={(input) =>
                actions.addEvidence.mutateAsync({
                  text: input.text,
                  url: input.url || undefined,
                })
              }
              pending={actions.addEvidence.isPending}
              error={errorOf(actions.addEvidence)}
            />
          </>
        )
      )}
    </div>
  );
}

export function SuggestionsSection({ discovery, actions }: SectionProps) {
  const [open, setOpen] = useState(false);
  const viewer = discovery.viewer;
  return (
    <div className="flex flex-col gap-3">
      {discovery.suggestions.length === 0 ? (
        <p className="text-small text-muted">No one has suggested a different identification.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {discovery.suggestions.map((suggestion) => {
            const Icon = categoryConfig[suggestion.category].icon;
            return (
              <li key={suggestion.id} className="flex flex-col gap-1 rounded-md border border-dashed border-border p-3">
                <p className="flex items-center gap-2 text-small font-medium">
                  <Icon aria-hidden className="size-4 text-muted" />
                  {suggestion.label}
                  <span className="text-meta font-normal text-muted">{categoryConfig[suggestion.category].label}</span>
                </p>
                {suggestion.note && <p className="text-small text-muted">{suggestion.note}</p>}
                <p className="text-meta text-muted">
                  Suggested by <AuthorLink {...suggestion.author} /> ·{" "}
                  <time dateTime={suggestion.at}>{formatDate(suggestion.at)}</time> · unverified
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {!viewer ? (
        <SignInPrompt action="suggest an identification" />
      ) : (
        viewer.canSuggest && (
          <>
            <Button variant="secondary" size="sm" className="self-start" onClick={() => setOpen(true)}>
              <Lightbulb aria-hidden />
              Suggest a different identification
            </Button>
            <SuggestIdentificationDialog
              open={open}
              onOpenChange={setOpen}
              onSubmit={(input) =>
                actions.suggest.mutateAsync({
                  ...input,
                  note: input.note || undefined,
                })
              }
              pending={actions.suggest.isPending}
              error={errorOf(actions.suggest)}
            />
          </>
        )
      )}
    </div>
  );
}

/** One report dialog per page, opened for whichever discovery or comment was flagged. */
function useReporting(actions: Actions) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const dialog = (
    <ReportDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          setTarget(null);
          actions.report.reset();
        }
      }}
      subject={target?.kind ?? "discovery"}
      onSubmit={({ reason, details }) => actions.report.mutateAsync({ target: target!, reason, details })}
      pending={actions.report.isPending}
      error={errorOf(actions.report)}
    />
  );
  return { report: setTarget, dialog };
}

export function DiscussionSection({ discovery, actions }: SectionProps) {
  const { report, dialog } = useReporting(actions);
  const viewer = discovery.viewer;
  return (
    <div className="flex flex-col gap-4">
      {discovery.comments.length === 0 ? (
        <p className="text-small text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {discovery.comments.map((comment) => (
            <li key={comment.id} className="group flex flex-col gap-1 border-l border-border pl-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-meta text-muted">
                  <AuthorLink {...comment.author} /> · <time dateTime={comment.at}>{formatDate(comment.at)}</time>
                </p>
                {viewer?.canReport && (
                  <button
                    type="button"
                    onClick={() => report({ kind: "comment", id: comment.id })}
                    className="-my-2 inline-flex min-h-10 items-center gap-1 rounded-sm px-2 text-meta text-muted hover:text-signal"
                  >
                    <Flag aria-hidden className="size-3" />
                    Report
                    <span className="sr-only"> comment by {comment.author.displayName}</span>
                  </button>
                )}
              </div>
              <p className="text-small">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
      {viewer ? (
        viewer.canComment && (
          <CommentForm
            onSubmit={(body) => actions.comment.mutateAsync(body)}
            pending={actions.comment.isPending}
            error={errorOf(actions.comment)}
          />
        )
      ) : (
        <SignInPrompt action="join the discussion" />
      )}
      {dialog}
    </div>
  );
}

export function ReportDiscoveryButton({ discovery, actions }: SectionProps) {
  const { report, dialog } = useReporting(actions);
  if (!discovery.viewer?.canReport) return null;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => report({ kind: "discovery", id: discovery.id })}>
        <Flag aria-hidden />
        Report
      </Button>
      {dialog}
    </>
  );
}

/** Follow the contributor, if the backend supports following. */
export function FollowButton({ discovery, actions }: SectionProps) {
  const following = discovery.viewer?.followingContributor;
  if (following === undefined) return null;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        aria-pressed={following}
        loading={actions.follow.isPending}
        onClick={() =>
          actions.follow.mutate({
            username: discovery.contributor.username,
            following: !following,
          })
        }
      >
        {following ? <UserCheck aria-hidden /> : <UserPlus aria-hidden />}
        {/* Visible text changes; the accessible name stays "Follow …" and aria-pressed carries the state. */}
        <span aria-hidden>{following ? "Following" : "Follow"}</span>
        <span className="sr-only">Follow {discovery.contributor.displayName}</span>
      </Button>
      <ActionError message={actions.follow.isError ? actionErrorMessage(actions.follow.error) : null} />
    </span>
  );
}
