"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { BadgeCheck, MailWarning, Trash2 } from "lucide-react";
import { ActionError, SignInPrompt } from "@/components/community/action-bits";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { actionErrorMessage } from "@/features/community/hooks";
import type { SettingsDataSource } from "./data/source";
import { useAccountSettings, useSettingsActions, useSettingsSource } from "./hooks";
import type { AccountSettings, Privacy } from "./types";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex max-w-xl scroll-mt-24 flex-col gap-4 rounded-lg border border-border bg-surface p-5"
    >
      <h2 id={`${id}-heading`} className="text-heading font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Privacy, email and account deletion, once the settings have loaded. */
export function AccountSettingsSections() {
  const source = useSettingsSource();
  if (source.isPending) return <LoadingState label="Loading settings" />;
  if (source.isError) return <ErrorState onRetry={() => source.refetch()} />;
  if (!source.data) return null; // No backend: the profile and account panels already say so.
  return <Loaded source={source.data} />;
}

function Loaded({ source }: { source: SettingsDataSource }) {
  const settings = useAccountSettings(source);
  if (settings.isPending) return <LoadingState label="Loading settings" />;
  if (settings.isError) return <ErrorState onRetry={() => settings.refetch()} />;
  if (!settings.data) {
    return (
      <Section id="privacy" title="Privacy">
        <SignInPrompt action="manage your privacy, email and account" />
      </Section>
    );
  }
  return (
    <>
      <Section id="privacy" title="Privacy">
        <PrivacyPanel source={source} privacy={settings.data.privacy} />
      </Section>
      <Section id="email" title="Email">
        <EmailPanel source={source} account={settings.data.account} />
      </Section>
      <Section id="delete-account" title="Delete account">
        <DeleteAccountPanel source={source} account={settings.data.account} />
      </Section>
    </>
  );
}

const privacyOptions: { key: keyof Privacy; label: string; description: string }[] = [
  {
    key: "profilePublic",
    label: "Public profile",
    description: "Others can open your profile. A private profile also stays off the leaderboards.",
  },
  { key: "showWallet", label: "Show my wallet", description: "Your linked wallet address appears on your public profile." },
  { key: "showActivity", label: "Show my activity", description: "Your recent discoveries and reviews appear on your public profile." },
  {
    key: "creditDiscoveries",
    label: "Credit me on my discoveries",
    description: "Your name shows on what you share. Off, they show as an anonymous contributor.",
  },
];

function PrivacyPanel({ source, privacy }: { source: SettingsDataSource; privacy: Privacy }) {
  const { setPrivacy } = useSettingsActions(source);
  return (
    <>
      <fieldset className="flex flex-col gap-3" disabled={setPrivacy.isPending}>
        <legend className="sr-only">Who can see what</legend>
        {privacyOptions.map((option) => (
          <label key={option.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-accent"
              checked={privacy[option.key]}
              onChange={(event) => setPrivacy.mutate({ [option.key]: event.target.checked })}
            />
            <span className="flex flex-col">
              <span className="text-small font-medium text-fg">{option.label}</span>
              <span className="text-meta text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ActionError message={setPrivacy.error ? actionErrorMessage(setPrivacy.error) : null} />
    </>
  );
}

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email.") });

function EmailPanel({ source, account }: { source: SettingsDataSource; account: AccountSettings["account"] }) {
  const { setEmail, resendVerification } = useSettingsActions(source);
  const [editing, setEditing] = useState(!account.email);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const failed = setEmail.error ?? resendVerification.error;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-muted">
        Optional. A verified email is a second way into your account, so you can change or unlink your wallet without losing
        it.
      </p>

      {account.email && (
        <p className="flex flex-wrap items-center gap-2 text-body">
          <span className="meta text-fg">{account.email}</span>
          {account.emailVerified ? (
            <Badge tone="accent">
              <BadgeCheck aria-hidden />
              Verified
            </Badge>
          ) : (
            <Badge tone="tentative">
              <MailWarning aria-hidden />
              Not verified
            </Badge>
          )}
        </p>
      )}

      {sentTo && (
        <p role="status" className="text-small text-fg">
          We sent a link to {sentTo}. Open it to verify your email.
        </p>
      )}

      {account.email && !account.emailVerified && !editing && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          loading={resendVerification.isPending}
          onClick={() => resendVerification.mutate(undefined, { onSuccess: () => setSentTo(account.email) })}
        >
          Resend verification link
        </Button>
      )}

      {editing ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={handleSubmit(({ email }) =>
            setEmail.mutate(email, {
              onSuccess: () => {
                setSentTo(email);
                setEditing(false);
                reset();
              },
            }),
          )}
        >
          <Field label={account.email ? "New email" : "Email"} error={errors.email?.message}>
            {(control) => <Input {...control} {...register("email")} type="email" autoComplete="email" />}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={setEmail.isPending}>
              {account.email ? "Change email" : "Add email"}
            </Button>
            {account.email && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setEditing(true)}>
          Change email
        </Button>
      )}

      <ActionError message={failed ? actionErrorMessage(failed) : null} />
    </div>
  );
}

function DeleteAccountPanel({ source, account }: { source: SettingsDataSource; account: AccountSettings["account"] }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const { deleteAccount } = useSettingsActions(source);
  const queryClient = useQueryClient();
  const router = useRouter();

  const confirmed = typed === "DELETE" && (!account.hasPassword || password.length > 0);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTyped("");
      setPassword("");
      deleteAccount.reset();
    }
  };

  const remove = () =>
    deleteAccount.mutate(account.hasPassword ? password : undefined, {
      onSuccess: async () => {
        // The backend has already revoked every session; clear this browser's cookies too.
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
        queryClient.clear();
        router.replace("/");
      },
    });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-muted">
        Closes your account for good. Your discoveries and the community&apos;s verification history stay, but are no longer
        linked to you.
      </p>
      <Button variant="warning" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete account
      </Button>

      <Dialog
        open={open}
        onOpenChange={close}
        title="Delete your account?"
        description="This can't be undone."
        variant="responsive"
      >
        <div className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-small text-muted">
            <li>Your username, email, bio and avatar are removed, and you&apos;re signed out everywhere.</li>
            <li>Your linked wallet is removed. Signing in with it again starts a new, empty account.</li>
            <li>Your discoveries stay for the community, shown without your name. Reputation can&apos;t be recovered.</li>
          </ul>
          {account.hasPassword && (
            <Field label="Password">
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>
          )}
          <Field label='Type "DELETE" to confirm'>
            {(control) => (
              <Input {...control} value={typed} autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
            )}
          </Field>
          <ActionError message={deleteAccount.error ? actionErrorMessage(deleteAccount.error) : null} />
          <div className="flex gap-2">
            <Button variant="warning" disabled={!confirmed} loading={deleteAccount.isPending} onClick={remove}>
              Delete my account
            </Button>
            <Button variant="ghost" onClick={() => close(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
