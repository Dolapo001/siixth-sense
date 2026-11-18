"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { commentSchema, type CommentInput } from "@/features/community/schemas";
import { succeeded } from "@/features/community/hooks";
import { announce } from "@/lib/announce";
import { ActionError } from "./action-bits";

type CommentFormProps = {
  onSubmit: (body: string) => Promise<unknown>;
  pending: boolean;
  error: string | null;
};

export function CommentForm({ onSubmit, pending, error }: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentInput>({ resolver: zodResolver(commentSchema) });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={handleSubmit(async ({ body }) => {
        // On failure the error prop shows the reason and the text is kept.
        if (await succeeded(onSubmit(body))) {
          reset();
          announce("Comment posted");
        }
      })}
    >
      <Field label="Add a comment" error={errors.body?.message}>
        {(control) => (
          <Textarea {...control} {...register("body")} placeholder="Share what you know about this discovery" />
        )}
      </Field>
      <ActionError message={error} />
      <Button type="submit" loading={pending} className="self-start">
        Post comment
      </Button>
    </form>
  );
}
