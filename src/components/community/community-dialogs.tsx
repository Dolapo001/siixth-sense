"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  evidenceSchema,
  reportSchema,
  suggestionSchema,
  type EvidenceInput,
  type ReportInput,
  type SuggestionInput,
} from "@/features/community/schemas";
import { reportReasons, type ReportReason } from "@/features/discoveries/types";
import { categoryConfig } from "@/features/world/categories";
import { discoveryCategories } from "@/features/world/types";
import { succeeded } from "@/features/community/hooks";
import { announce } from "@/lib/announce";
import { ActionError } from "./action-bits";

type DialogFormProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: T) => Promise<unknown>;
  pending: boolean;
  error: string | null;
};

export function SuggestIdentificationDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
}: DialogFormProps<SuggestionInput>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SuggestionInput>({ resolver: zodResolver(suggestionSchema) });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="responsive"
      title="Suggest a different identification"
      description="Think the identification is wrong? Say what you think it is. Suggestions stay unverified until reviewers agree."
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (input) => {
          if (await succeeded(onSubmit(input))) {
            reset();
            onOpenChange(false);
            announce("Suggestion added");
          }
        })}
      >
        <Field label="What is it?" required error={errors.label?.message}>
          {(control) => <Input {...control} {...register("label")} />}
        </Field>
        <Field label="Category" required error={errors.category?.message}>
          {(control) => (
            <Select {...control} defaultValue="" {...register("category")}>
              <option value="" disabled>
                Select…
              </option>
              {discoveryCategories.map((category) => (
                <option key={category} value={category}>
                  {categoryConfig[category].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Why?" hint="Optional. What makes you think so?" error={errors.note?.message}>
          {(control) => <Textarea {...control} {...register("note")} />}
        </Field>
        <ActionError message={error} />
        <Button type="submit" loading={pending} className="self-start">
          Submit suggestion
        </Button>
      </form>
    </Dialog>
  );
}

export function AddEvidenceDialog({ open, onOpenChange, onSubmit, pending, error }: DialogFormProps<EvidenceInput>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EvidenceInput>({ resolver: zodResolver(evidenceSchema) });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="responsive"
      title="Add supporting evidence"
      description="Describe what supports or contradicts this discovery. Link to a source if you have one."
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (input) => {
          if (await succeeded(onSubmit(input))) {
            reset();
            onOpenChange(false);
            announce("Evidence added");
          }
        })}
      >
        <Field label="Evidence" required error={errors.text?.message}>
          {(control) => <Textarea {...control} {...register("text")} />}
        </Field>
        <Field label="Link" hint="Optional. A page or image that backs this up." error={errors.url?.message}>
          {(control) => <Input {...control} type="url" inputMode="url" placeholder="https://" {...register("url")} />}
        </Field>
        <ActionError message={error} />
        <Button type="submit" loading={pending} className="self-start">
          Add evidence
        </Button>
      </form>
    </Dialog>
  );
}

type ReportDialogProps = DialogFormProps<{ reason: ReportReason; details?: string }> & {
  /** What's being reported, for the title: "discovery" or "comment". */
  subject: string;
};

export function ReportDialog({ open, onOpenChange, onSubmit, pending, error, subject }: ReportDialogProps) {
  const [sent, setSent] = useState(false);
  // Two report dialogs can be mounted at once (discovery and comment), so ids must be unique.
  const reasonErrorId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportInput>({ resolver: zodResolver(reportSchema) });

  const close = (next: boolean) => {
    if (!next) {
      setSent(false);
      reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={`Report this ${subject}`}
      description="Reports go to Sixth Sense moderators. They won't be shown publicly."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-body">
            Thanks. Moderators will review your report.
          </p>
          <Button variant="secondary" className="self-start" onClick={() => close(false)}>
            Done
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(async ({ reason, details }) => {
            if (await succeeded(onSubmit({ reason: reason as ReportReason, details }))) setSent(true);
          })}
        >
          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={errors.reason ? reasonErrorId : undefined}
            aria-invalid={errors.reason ? true : undefined}
            aria-required
          >
            <legend className="mb-1 text-small font-medium">Reason</legend>
            {reportReasons.map((reason) => (
              <label key={reason.value} className="flex items-center gap-2 text-small">
                <input type="radio" value={reason.value} {...register("reason")} className="accent-accent" />
                {reason.label}
              </label>
            ))}
            {errors.reason && (
              <p id={reasonErrorId} role="alert" className="text-meta text-signal">
                {errors.reason.message}
              </p>
            )}
          </fieldset>
          <Field label="Details" hint="Optional." error={errors.details?.message}>
            {(control) => <Textarea {...control} {...register("details")} />}
          </Field>
          <ActionError message={error} />
          <Button type="submit" variant="warning" loading={pending} className="self-start">
            Send report
          </Button>
        </form>
      )}
    </Dialog>
  );
}
