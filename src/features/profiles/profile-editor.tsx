"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleCheck, X } from "lucide-react";
import { ActionError } from "@/components/community/action-bits";
import { Avatar } from "@/components/profiles/avatar";
import { AvatarArt, avatarPresets } from "@/components/profiles/avatar-presets";
import { LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useSession } from "@/features/authentication/hooks";
import { actionErrorMessage } from "@/features/community/hooks";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utilities/cn";
import type { ProfileDataSource } from "./data/source";
import { useProfile, useProfileSource } from "./hooks";
import { profileSchema, usernameSchema, type ProfileFormInput } from "./schemas";
import type { Profile } from "./types";

/** Edit your profile: avatar, username, display name and bio. */
export function ProfileEditor() {
  const session = useSession();
  const source = useProfileSource();

  if (session.isPending || source.isPending) return <LoadingState label="Loading your profile" />;
  if (!session.data) {
    return (
      <p className="text-small text-muted">
        <Link href="/auth/login?next=/settings" className="text-accent underline underline-offset-2">
          Sign in
        </Link>{" "}
        to edit your profile.
      </p>
    );
  }
  if (!source.data) {
    return <p className="text-small text-muted">Editing profiles needs the Sixth Sense backend, which isn&apos;t connected yet.</p>;
  }
  return <LoadedEditor source={source.data} username={session.data.user.username} />;
}

function LoadedEditor({ source, username }: { source: ProfileDataSource; username: string }) {
  const profile = useProfile(source, username);
  if (profile.isPending) return <LoadingState label="Loading your profile" />;
  if (!profile.data) return <p className="text-small text-muted">Your profile couldn&apos;t be loaded.</p>;
  // Remount on save so the form starts from what the server returned.
  return <EditorForm key={profile.data.username + profile.data.displayName} source={source} profile={profile.data} />;
}

/** The value after it stops changing for `ms`. */
function useSettled<T>(value: T, ms = 400) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

function EditorForm({ source, profile }: { source: ProfileDataSource; profile: Profile }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      avatarId: profile.avatarId,
    },
  });
  const values = useWatch({ control });

  // Live username check, once typing settles and the name is well-formed.
  const candidate = useSettled((values.username ?? "").trim().toLowerCase());
  const wellFormed = usernameSchema.safeParse(candidate).success;
  const changed = candidate !== profile.username;
  const check = useQuery({
    queryKey: ["profiles", "username-check", candidate],
    queryFn: ({ signal }) => source.checkUsername(candidate, signal),
    enabled: wellFormed && changed,
  });
  const unavailable = changed && check.data?.available === false;

  return (
    <form
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]"
      onSubmit={handleSubmit(async (input) => {
        setError(null);
        setSaved(null);
        try {
          const next = await source.updateProfile({
            username: input.username.trim().toLowerCase(),
            displayName: input.displayName.trim(),
            bio: input.bio.trim() || null,
            avatarId: (input.avatarId ?? null) as Profile["avatarId"],
          });
          await queryClient.invalidateQueries({ queryKey: ["profiles"] });
          setSaved(next.username);
          announce("Profile saved");
        } catch (e) {
          setError(actionErrorMessage(e));
        }
      })}
    >
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-small font-medium">Avatar</legend>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {[{ id: null, label: "Initials" }, ...avatarPresets].map((preset) => {
              const checked = (values.avatarId ?? null) === preset.id;
              return (
                <label key={preset.id ?? "initials"} className="group flex cursor-pointer flex-col items-center gap-1.5">
                  <input
                    type="radio"
                    name="avatar"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => setValue("avatarId", preset.id, { shouldDirty: true })}
                  />
                  <span
                    className={cn(
                      "rounded-full p-0.5 ring-2 ring-transparent transition-shadow peer-focus-visible:ring-accent/70",
                      checked ? "ring-accent" : "group-hover:ring-border-strong",
                    )}
                  >
                    {preset.id ? (
                      <AvatarArt preset={preset.id} className="size-14 rounded-full" />
                    ) : (
                      <Avatar name={values.displayName || profile.displayName} size="lg" className="size-14 text-heading" />
                    )}
                  </span>
                  <span className={cn("text-center text-meta", checked ? "text-fg" : "text-muted")}>{preset.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-meta text-muted">Original artwork drawn for Sixth Sense, inspired by Leonida.</p>
        </fieldset>

        <Field
          label="Username"
          required
          hint="Your profile address: 3–20 characters, starting with a letter. Letters, numbers and underscores."
          error={errors.username?.message ?? (unavailable ? check.data?.reason : undefined)}
        >
          {(controlProps) => (
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-small text-muted">
                @
              </span>
              <Input
                {...controlProps}
                {...register("username")}
                autoComplete="off"
                spellCheck={false}
                className="pl-7"
              />
              {changed && wellFormed && (
                <span aria-live="polite" className="absolute top-1/2 right-3 -translate-y-1/2 text-meta">
                  {check.isFetching ? (
                    <span className="text-muted">Checking…</span>
                  ) : check.data?.available ? (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <Check aria-hidden className="size-3.5" />
                      Available
                    </span>
                  ) : check.data ? (
                    <span className="inline-flex items-center gap-1 text-signal">
                      <X aria-hidden className="size-3.5" />
                      Taken
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          )}
        </Field>

        <Field label="Display name" required hint="How your name appears next to your discoveries." error={errors.displayName?.message}>
          {(controlProps) => <Input {...controlProps} {...register("displayName")} />}
        </Field>

        <Field label="Bio" hint={`Optional. ${160 - (values.bio?.length ?? 0)} characters left.`} error={errors.bio?.message}>
          {(controlProps) => (
            <Textarea {...controlProps} {...register("bio")} placeholder="e.g. Mapping every hidden corner of the Keys." />
          )}
        </Field>

        <ActionError message={error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty || unavailable}>
            Save profile
          </Button>
          {saved && (
            <p role="status" className="inline-flex items-center gap-1.5 text-small">
              <CircleCheck aria-hidden className="size-4 text-accent" />
              Saved.{" "}
              <Link href={`/profile/${saved}`} className="text-accent underline underline-offset-2">
                View your profile
              </Link>
            </p>
          )}
        </div>
      </div>

      <aside aria-label="Preview" className="flex flex-col gap-3 self-start rounded-lg border border-border bg-surface-elevated/60 p-5">
        <p className="eyebrow">Preview</p>
        <div className="flex items-center gap-3">
          <Avatar
            name={values.displayName || profile.displayName}
            preset={(values.avatarId ?? null) as Profile["avatarId"]}
            size="lg"
            className="size-14 text-heading"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-semibold">{values.displayName || profile.displayName}</span>
            <span className="meta truncate text-muted">@{(values.username || profile.username).toLowerCase()}</span>
          </div>
        </div>
        {values.bio ? <p className="text-small text-muted">{values.bio}</p> : null}
      </aside>
    </form>
  );
}
