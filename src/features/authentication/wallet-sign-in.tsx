"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import bs58 from "bs58";
import { CircleCheck, Loader2, Unplug } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button, buttonStyles } from "@/components/ui/button";
import { SeedPhraseWarning } from "@/components/web3/web3-bits";
import { useWalletControls } from "@/features/web3/wallet";
import { isUserRejection } from "@/features/web3/wallet-controls";
import { announce } from "@/lib/announce";
import { shortAddress } from "@/lib/utilities/solana";
import { useSession } from "./hooks";
import { TERMS_REQUIRED } from "./siws";

type Step = "idle" | "requesting" | "signing" | "verifying";

const stepText: Record<Exclude<Step, "idle">, string> = {
  requesting: "Getting a one-time message from Sixth Sense…",
  signing: "Check your wallet and approve the signature request.",
  verifying: "Checking the signature…",
};

/** Only same-site paths, so a crafted link can't send players elsewhere after signing in. */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth") ? next : "/world";
}

class SignInError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SignInError(data?.error?.message ?? "Sign-in didn't go through. Try again.", data?.error?.code ?? null);
  }
  return data as T;
}

/** Sign-In With Solana: connect a wallet, sign a one-time message, done. Needs SolanaWalletProvider. */
export function WalletSignIn({ mode }: { mode: "sign-in" | "create" }) {
  const controls = useWalletControls();
  const session = useSession();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  // Creating an account means accepting the terms; signing in to an existing one doesn't.
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsNeeded, setTermsNeeded] = useState(mode === "create");

  const title = mode === "create" ? "Create your account" : "Sign in";

  const signIn = async () => {
    const { address, signMessage } = controls;
    if (!address || !signMessage) return;
    if (termsNeeded && !acceptTerms) {
      setError("Accept the terms to create your account.");
      return;
    }
    setError(null);
    try {
      setStep("requesting");
      const { message, nonce } = await postJson<{ message: string; nonce: string }>("/api/auth/challenge", { address });
      setStep("signing");
      const signature = await signMessage(new TextEncoder().encode(message));
      setStep("verifying");
      await postJson("/api/auth/verify", { nonce, signature: bs58.encode(signature), acceptTerms });
      // Everything cached so far was fetched signed out.
      await queryClient.invalidateQueries();
      announce("Signed in");
      router.replace(next);
    } catch (e) {
      setStep("idle");
      if (e instanceof SignInError && e.code === TERMS_REQUIRED) {
        // A wallet Sixth Sense hasn't seen: the challenge is used up, so the player signs again after accepting.
        setTermsNeeded(true);
        setError("This wallet doesn't have a Sixth Sense account yet. Accept the terms, then sign again to create one.");
        return;
      }
      setError(
        isUserRejection(e)
          ? "You cancelled the signature request. You're not signed in."
          : e instanceof Error
            ? e.message
            : "Sign-in didn't go through. Try again.",
      );
    }
  };

  if (session.data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-title font-semibold">You&apos;re signed in</h1>
        <p className="text-small text-muted">
          As <span className="meta text-fg">{session.data.user.displayName}</span>.
        </p>
        <Link href={next} className={buttonStyles({ className: "self-start" })}>
          Continue
        </Link>
      </div>
    );
  }

  const busy = step !== "idle";

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-semibold">{title}</h1>
        <p className="text-small text-muted">
          Your Solana wallet is your Sixth Sense account. You&apos;ll sign a one-time message to prove it&apos;s yours:
          no transaction, no cost, no password.
        </p>
      </div>

      {!controls.connected || !controls.address ? (
        controls.available.length === 0 ? (
          <EmptyState
            title="No Solana wallet found"
            description="Install a Solana wallet browser extension (for example Phantom, Solflare or Backpack), then reload this page."
            className="py-4"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-small font-medium">Choose your wallet</p>
            <ul className="flex flex-col gap-2">
              {controls.available.map((wallet) => (
                <li key={wallet.name}>
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    loading={controls.connecting}
                    onClick={() => controls.connect(wallet.name)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- wallet-provided data URI icon */}
                    <img src={wallet.icon} alt="" className="size-5 rounded-sm" />
                    {wallet.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-small">
            <CircleCheck aria-hidden className="size-4 text-accent" />
            {controls.walletName} connected:
            <span className="meta text-fg" title={controls.address}>
              {shortAddress(controls.address)}
            </span>
          </p>
          {termsNeeded && (
            <label className="flex items-start gap-2 text-small">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-accent"
                checked={acceptTerms}
                disabled={busy}
                onChange={(event) => setAcceptTerms(event.target.checked)}
              />
              <span>I accept the Sixth Sense terms of use and privacy policy.</span>
            </label>
          )}
          {controls.signMessage ? (
            <Button onClick={signIn} loading={busy} className="self-start">
              {mode === "create" || termsNeeded ? "Create account with this wallet" : "Sign in with this wallet"}
            </Button>
          ) : (
            <p className="text-small text-signal">This wallet can&apos;t sign messages, so it can&apos;t sign you in.</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            disabled={busy}
            onClick={() => void controls.disconnect()}
          >
            <Unplug aria-hidden />
            Use a different wallet
          </Button>
        </div>
      )}

      <div aria-live="polite" className="min-h-5 text-small">
        {busy && (
          <span className="flex items-center gap-2 text-muted">
            <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
            {stepText[step]}
          </span>
        )}
        {error && <span className="text-signal">{error}</span>}
      </div>

      <SeedPhraseWarning />

      <p className="text-meta text-muted">
        {mode === "create" ? (
          <>
            Signed in before? <Link href="/auth/login" className="text-fg underline underline-offset-2">Sign in</Link>.
            It&apos;s the same step.
          </>
        ) : (
          <>
            New here? Signing in with your wallet creates your account. You can also{" "}
            <Link href="/world" className="text-fg underline underline-offset-2">
              keep exploring without one
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
