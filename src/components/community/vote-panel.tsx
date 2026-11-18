"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { disputeSchema, type DisputeInput } from "@/features/community/schemas";
import type { ViewerPermissions, Vote } from "@/features/discoveries/types";
import { succeeded } from "@/features/community/hooks";
import { ActionError, SignInPrompt } from "./action-bits";

type VotePanelProps = {
  viewer: ViewerPermissions | null;
  onVote: (vote: Vote, reason?: string) => Promise<unknown>;
  pending: boolean;
  error: string | null;
};

/**
 * Confirm or dispute a discovery. Eligibility and the resulting status come
 * from the server; a dispute always needs a reason reviewers can check.
 */
export function VotePanel({ viewer, onVote, pending, error }: VotePanelProps) {
  const [disputing, setDisputing] = useState(false);
  // Closing the dispute form unmounts the focused control; hand focus back to
  // Dispute as it remounts. The callback only changes when returnFocus does,
  // so it focuses once rather than on every render.
  const [returnFocus, setReturnFocus] = useState(false);
  const focusDisputeOnReturn = useCallback(
    (button: HTMLButtonElement | null) => {
      if (button && returnFocus) button.focus();
    },
    [returnFocus],
  );

  const openDispute = () => {
    setReturnFocus(false);
    setDisputing(true);
  };
  const closeDispute = () => {
    setReturnFocus(true);
    setDisputing(false);
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisputeInput>({ resolver: zodResolver(disputeSchema) });

  if (!viewer) return <SignInPrompt action="confirm or dispute discoveries" />;
  if (!viewer.vote.allowed) {
    return (
      <p className="flex items-start gap-2 text-small text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {viewer.vote.reason ?? "You can't vote on this discovery."}
      </p>
    );
  }

  const current = viewer.vote.current;

  return (
    <div className="flex flex-col gap-3">
      {current && (
        <p className="text-small text-muted" role="status">
          You {current === "confirm" ? "confirmed" : "disputed"} this. You can change your vote.
        </p>
      )}
      {!disputing && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={current === "confirm" ? "primary" : "secondary"}
            aria-pressed={current === "confirm"}
            // aria-disabled, not disabled: keeps the pressed state reachable by keyboard.
            aria-disabled={current === "confirm"}
            loading={pending}
            onClick={() => {
              if (current !== "confirm") void succeeded(onVote("confirm"));
            }}
          >
            <CircleCheck aria-hidden />
            Confirm
          </Button>
          <Button
            ref={focusDisputeOnReturn}
            variant="warning"
            aria-pressed={current === "dispute"}
            disabled={pending}
            onClick={openDispute}
          >
            <TriangleAlert aria-hidden />
            Dispute
          </Button>
        </div>
      )}
      {disputing && (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={handleSubmit(async ({ reason }) => {
            if (await succeeded(onVote("dispute", reason))) {
              reset();
              closeDispute();
            }
          })}
        >
          <Field label="Why are you disputing it?" required error={errors.reason?.message}>
            {(control) => (
              <Textarea
                {...control}
                {...register("reason")}
                placeholder="e.g. The wheels don't match this model"
                autoFocus
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="warning" loading={pending}>
              Submit dispute
            </Button>
            <Button variant="ghost" onClick={closeDispute}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <ActionError message={error} />
    </div>
  );
}
