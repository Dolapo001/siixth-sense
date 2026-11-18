"use client";

import Link from "next/link";
import { BadgeCheck, Loader2, Plug, Unplug, Wallet } from "lucide-react";
import { ActionError, SignInPrompt } from "@/components/community/action-bits";
import { formatDate } from "@/components/discoveries/discovery-items";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableValue, ExplorerLink, SeedPhraseWarning, shortAddress } from "@/components/web3/web3-bits";
import { useSession } from "@/features/authentication/hooks";
import type { Web3DataSource } from "./data/source";
import { useLinkedWallet, useLinkWallet, useWalletTransactions, useWeb3Source, type LinkStep } from "./hooks";
import type { LinkedWallet } from "./types";
import { useWalletControls, type WalletControls } from "./wallet";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

/** Route entry: needs the wallet provider from the Web3 layout. */
export function Web3Identity() {
  const source = useWeb3Source();
  const controls = useWalletControls();
  if (source.isPending) return <LoadingState label="Loading wallet settings" />;
  if (source.isError) return <ErrorState onRetry={() => source.refetch()} />;
  if (!source.data) {
    return (
      <UnavailableState description="Linking a wallet needs the Sixth Sense backend, which isn't connected yet. Everything else works without one." />
    );
  }
  return <IdentityView source={source.data} controls={controls} />;
}

export function IdentityView({ source, controls }: { source: Web3DataSource; controls: WalletControls }) {
  const session = useSession();
  const linked = useLinkedWallet(source);
  const signedIn = !!session.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Panel title="Optional">
          <p className="text-body">
            Everything in Sixth Sense works without a wallet. Linking one lets you receive on-chain attestations and rewards
            for verified discoveries.
          </p>
          <p className="text-small text-muted">Sixth Sense uses {source.network.name} only. Nothing here costs anything.</p>
          <SeedPhraseWarning />
        </Panel>

        <Panel title="Wallet connection">
          <ConnectionPanel controls={controls} />
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Ownership">
          {!signedIn ? (
            session.isPending ? null : (
              <SignInPrompt action="link a wallet to your account" />
            )
          ) : linked.isPending ? (
            <LoadingState label="Checking linked wallet" />
          ) : linked.isError ? (
            <ErrorState onRetry={() => linked.refetch()} className="py-4" />
          ) : (
            <OwnershipPanel
              source={source}
              controls={controls}
              linked={linked.data}
              walletOnly={session.data?.walletOnly === true}
            />
          )}
        </Panel>

        {signedIn && linked.data && (
          <Panel title="Transactions">
            <TransactionList source={source} />
          </Panel>
        )}
      </div>
    </div>
  );
}

function ConnectionPanel({ controls }: { controls: WalletControls }) {
  if (controls.connected && controls.address) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-small">
          <Badge tone="accent">
            <Plug aria-hidden />
            Connected
          </Badge>
          {controls.walletName}
        </p>
        <CopyableValue value={controls.address} label="wallet address" short={false} />
        <p className="text-meta text-muted">
          Connected only in this browser. It isn&apos;t linked to your Sixth Sense account until you verify ownership.
        </p>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => void controls.disconnect()}>
          <Unplug aria-hidden />
          Disconnect
        </Button>
      </div>
    );
  }

  if (controls.available.length === 0) {
    return (
      <EmptyState
        title="No Solana wallet found"
        description="Install a Solana wallet browser extension, then reload this page. Sixth Sense works fine without one."
        className="py-6"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-muted">Choose a wallet installed in this browser:</p>
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
              Connect {wallet.name}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const stepText: Record<LinkStep, string> = {
  idle: "",
  requesting: "Getting a one-time message from Sixth Sense…",
  signing: "Check your wallet and approve the signature request.",
  verifying: "Checking the signature…",
  done: "Wallet verified and linked.",
  error: "",
};

function OwnershipPanel({
  source,
  controls,
  linked,
  walletOnly,
}: {
  source: Web3DataSource;
  controls: WalletControls;
  linked: LinkedWallet | null | undefined;
  /** This wallet is the only way into the account: unlinking must not be offered. */
  walletOnly: boolean;
}) {
  const flow = useLinkWallet(source, controls);
  const busy = flow.step === "requesting" || flow.step === "signing" || flow.step === "verifying";

  if (linked) {
    const different = controls.address && controls.address !== linked.address;
    return (
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-small">
          {linked.verified ? (
            <Badge tone="accent">
              <BadgeCheck aria-hidden />
              Verified
            </Badge>
          ) : (
            <Badge tone="tentative">Not verified</Badge>
          )}
          Linked on {formatDate(linked.linkedAt)} · {linked.network}
        </p>
        <CopyableValue value={linked.address} label="linked wallet address" short={false} />
        {different && (
          <p className="text-small text-muted">
            The connected wallet ({shortAddress(controls.address!)}) is different from your linked wallet.
          </p>
        )}
        <ActionError message={flow.error} />
        {walletOnly ? (
          // Signing in again with the same wallet would create a NEW account,
          // so unlinking here is unrecoverable. The backend has no guard yet,
          // so the only safe thing is not to offer it.
          <p className="text-small text-muted">
            This wallet is how you sign in, so it can&apos;t be unlinked. Add an email to your account first and you&apos;ll
            be able to change wallets.
          </p>
        ) : (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => void flow.unlink()}>
            <Unplug aria-hidden />
            Unlink wallet
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-small">
        <Badge tone="neutral">
          <Wallet aria-hidden />
          No wallet linked
        </Badge>
      </p>
      <p className="text-small text-muted">
        To link a wallet, you&apos;ll sign a short message with it. That proves you own it. It isn&apos;t a transaction
        and costs nothing.
      </p>
      {!controls.connected ? (
        <p className="text-small text-muted">Connect a wallet first.</p>
      ) : !controls.signMessage ? (
        <p className="text-small text-muted">
          This wallet can&apos;t sign messages, so it can&apos;t be verified. Try another wallet.
        </p>
      ) : (
        <Button className="self-start" loading={busy} onClick={() => void flow.link()}>
          Verify ownership
        </Button>
      )}
      {flow.message && busy && (
        <details className="rounded-md border border-border p-3" open={flow.step === "signing"}>
          <summary className="cursor-pointer text-small text-muted">Message you&apos;re signing</summary>
          <pre className="meta mt-2 whitespace-pre-wrap text-muted">{flow.message}</pre>
        </details>
      )}
      <p role="status" className="flex items-center gap-2 text-small text-muted">
        {busy && <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />}
        {stepText[flow.step]}
      </p>
      <ActionError message={flow.error} />
    </div>
  );
}

function TransactionList({ source }: { source: Web3DataSource }) {
  const transactions = useWalletTransactions(source, true);
  if (transactions.isPending) return <LoadingState label="Loading transactions" />;
  if (transactions.isError) return <ErrorState onRetry={() => transactions.refetch()} className="py-4" />;
  if (transactions.data.length === 0) {
    return <p className="text-small text-muted">No on-chain activity for this wallet yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {transactions.data.map((tx) => (
        <li key={tx.id} className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-small">{tx.description}</span>
            <Badge tone="neutral">{tx.kind === "attestation" ? "Attestation" : "Reward"}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={tx.at} className="meta text-muted">
              {formatDate(tx.at)}
            </time>
            <CopyableValue value={tx.signature} label="transaction signature" />
            <ExplorerLink href={tx.explorerUrl} />
          </div>
        </li>
      ))}
      <li className="pt-3 text-meta text-muted">
        See also{" "}
        <Link href="/web3/proof" className="text-accent underline underline-offset-2 hover:decoration-2">
          Proof of Discovery
        </Link>{" "}
        for all attestations.
      </li>
    </ul>
  );
}
