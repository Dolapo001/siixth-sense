"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { voteReasonSchema, type VoteReasonInput } from "@/features/community/schemas";
import type { ViewerPermissions, Vote } from "@/features/discoveries/types";
import { succeeded } from "@/features/community/hooks";
import { ActionError, SignInPrompt } from "./action-bits";

type VotePanelProps = {
  viewer: ViewerPermissions | null;
  onVote: (vote: Vote, reason: string) => Promise<unknown>;
  pending: boolean;
  error: string | null;
};

const form: Record<Vote, { label: string; placeholder: string; submit: string; variant: "primary" | "warning" }> = {
  confirm: {
    label: "Why does it check out?",
    placeholder: "e.g. The badge and tail lights match this model",
    submit: "Submit confirmation",
    variant: "primary",
  },
  dispute: {
    label: "Why are you disputing it?",
    placeholder: "e.g. The wheels don't match this model",
    submit: "Submit dispute",
    variant: "warning",
  },
};

/**
 * Confirm or dispute a discovery. Eligibility and the resulting status come
 * from the server. Every vote needs a reason reviewers can check (the server
 * requires one), and a vote is final: it can't be changed or withdrawn.
 */
export function VotePanel({ viewer, onVote, pending, error }: VotePanelProps) {
  const [voting, setVoting] = useState<Vote | null>(null);
  // Closing the form unmounts the focused control; hand focus back to the
  // button that opened it as it remounts. The callback only changes when
  // returnFocus does, so it focuses once rather than on every render.
  const [returnFocus, setReturnFocus] = useState<Vote | null>(null);
  const focusOnReturn = useCallback(
    (vote: Vote) => (button: HTMLButtonElement | null) => {
      if (button && returnFocus === vote) button.focus();
    },
    [returnFocus],
  );

  const open = (vote: Vote) => {
    setReturnFocus(null);
    setVoting(vote);
  };
  const close = () => {
    setReturnFocus(voting);
    setVoting(null);
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoteReasonInput>({ resolver: zodResolver(voteReasonSchema) });

  if (!viewer) return <SignInPrompt action="confirm or dispute discoveries" />;

  const current = viewer.vote.current;
  if (current) {
    return (
      <p className="flex items-start gap-2 text-small text-muted" role="status">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        You {current === "confirm" ? "confirmed" : "disputed"} this. Votes can&apos;t be changed.
      </p>
    );
  }
  if (!viewer.vote.allowed) {
    return (
      <p className="flex items-start gap-2 text-small text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {viewer.vote.reason ?? "You can't vote on this discovery."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!voting && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button ref={focusOnReturn("confirm")} variant="secondary" disabled={pending} onClick={() => open("confirm")}>
              <CircleCheck aria-hidden />
              Confirm
            </Button>
            <Button ref={focusOnReturn("dispute")} variant="warning" disabled={pending} onClick={() => open("dispute")}>
              <TriangleAlert aria-hidden />
              Dispute
            </Button>
          </div>
          <p className="text-meta text-muted">You&apos;ll be asked why. Votes are final.</p>
        </>
      )}
      {voting && (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={handleSubmit(async ({ reason }) => {
            if (await succeeded(onVote(voting, reason))) {
              reset();
              setVoting(null);
            }
          })}
        >
          <Field label={form[voting].label} required error={errors.reason?.message}>
            {(control) => (
              <Textarea {...control} {...register("reason")} placeholder={form[voting].placeholder} autoFocus />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant={form[voting].variant} loading={pending}>
              {form[voting].submit}
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <ActionError message={error} />
    </div>
  );
}
