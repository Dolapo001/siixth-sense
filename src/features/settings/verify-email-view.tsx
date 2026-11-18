"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { buttonStyles } from "@/components/ui/button";
import { actionErrorMessage } from "@/features/community/hooks";
import { useSettingsSource } from "./hooks";

/** Where the verification email links: confirms the address from its token. Works signed out. */
export function VerifyEmailView() {
  const token = useSearchParams().get("token") ?? "";
  const source = useSettingsSource();
  const queryClient = useQueryClient();

  // A query, not an effect: it runs once per token even under Strict Mode, and
  // verifying twice is harmless on the backend anyway.
  const verify = useQuery({
    queryKey: ["settings", "verify-email", token],
    queryFn: async () => {
      await source.data!.verifyEmail(token);
      return true;
    },
    enabled: !!token && !!source.data,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // A verified email changes what the session allows (e.g. unlinking the wallet).
    if (verify.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      void queryClient.invalidateQueries({ queryKey: ["settings", "account"] });
    }
  }, [verify.isSuccess, queryClient]);

  return (
    <PageContainer>
      <PageHeader eyebrow="Account" title="Verify your email" />
      {!token ? (
        <ErrorState
          title="This link is incomplete"
          description="Open the link from your email again, or ask for a new one in Settings."
        />
      ) : source.isPending || verify.isPending ? (
        source.data === null ? (
          <UnavailableState description="Email verification needs the Sixth Sense backend, which isn't connected yet." />
        ) : (
          <LoadingState label="Verifying your email" />
        )
      ) : verify.isError ? (
        <ErrorState
          title="We couldn't verify your email"
          description={`${actionErrorMessage(verify.error)} Links expire, so ask for a new one in Settings.`}
        />
      ) : (
        <section role="status" className="flex max-w-xl flex-col gap-4 rounded-lg border border-accent/40 bg-surface p-5">
          <p className="flex items-center gap-2 text-heading font-semibold">
            <BadgeCheck aria-hidden className="size-5 text-accent" />
            Email verified
          </p>
          <p className="text-small text-muted">
            Your email is now a second way into your account, so you can change or unlink your wallet without losing it.
          </p>
          <Link href="/settings#email" className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}>
            Back to settings
          </Link>
        </section>
      )}
    </PageContainer>
  );
}
