"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Link2, Users } from "lucide-react";
import { formatDate } from "@/components/discoveries/discovery-items";
import { Pagination } from "@/components/discoveries/pagination";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { CopyableValue, ExplorerLink } from "@/components/web3/web3-bits";
import { cn } from "@/lib/utilities/cn";
import type { Web3DataSource } from "./data/source";
import { useAttestations, useWeb3Source } from "./hooks";

/** The difference between the two kinds of trust, stated up front. */
function TrustExplainer() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-heading font-semibold">
          <Users aria-hidden className="size-5 text-accent" />
          Community verification
        </h2>
        <p className="text-small text-muted">
          Reviewers check the discovery itself. This is what tells you whether an identification is <em>correct</em>.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-heading font-semibold">
          <Link2 aria-hidden className="size-5 text-accent" />
          On-chain attestation
        </h2>
        <p className="text-small text-muted">
          A public record that Sixth Sense registered the discovery, and its status, at a point in time. It proves Sixth Sense
          recorded it through its process. It does <strong>not</strong> prove the discovery is correct.
        </p>
      </div>
    </div>
  );
}

export function ProofOfDiscovery() {
  const source = useWeb3Source();
  return (
    <div className="flex flex-col gap-6">
      <TrustExplainer />
      {source.isPending ? (
        <LoadingState label="Loading attestations" />
      ) : source.isError ? (
        <ErrorState onRetry={() => source.refetch()} />
      ) : !source.data ? (
        <UnavailableState description="Attestations come from the Sixth Sense backend, which isn't connected yet." />
      ) : (
        <AttestationList source={source.data} />
      )}
    </div>
  );
}

function AttestationList({ source }: { source: Web3DataSource }) {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const list = useAttestations(source, page);

  if (list.isPending) return <LoadingState label="Loading attestations" />;
  if (list.isError) return <ErrorState onRetry={() => list.refetch()} />;
  if (list.data.total === 0) {
    return (
      <EmptyState
        title="No attestations yet"
        description="Attestations appear after verified discoveries are recorded on-chain."
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.data.total / list.data.pageSize));
  return (
    <section
      aria-labelledby="attestations"
      className={cn("flex flex-col gap-4", list.isPlaceholderData && "opacity-80")}
      aria-busy={list.isPlaceholderData}
    >
      <h2 id="attestations" className="meta text-muted">
        {list.data.total} attestations · {source.network.name}
      </h2>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {list.data.items.map((attestation) => (
          <li key={attestation.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Link
                href={`/discoveries/${attestation.discoveryId}`}
                className="truncate text-body font-semibold hover:text-accent"
              >
                {attestation.discoveryTitle}
              </Link>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                <span>
                  by{" "}
                  <Link href={`/profile/${attestation.contributor.username}`} className="text-fg hover:text-accent">
                    {attestation.contributor.displayName}
                  </Link>
                </span>
                {attestation.contributorWallet ? (
                  <CopyableValue value={attestation.contributorWallet} label="contributor wallet" />
                ) : (
                  <span>No wallet linked</span>
                )}
                <time dateTime={attestation.recordedAt}>Recorded {formatDate(attestation.recordedAt)}</time>
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                <span>{attestation.network}</span>
                <CopyableValue value={attestation.signature} label="transaction signature" />
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="text-meta text-muted">Status when recorded</span>
              <VerificationBadge status={attestation.status} />
              <ExplorerLink href={attestation.explorerUrl} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination
        page={list.data.page}
        totalPages={totalPages}
        hrefFor={(p) => (p === 1 ? "/web3/proof" : `/web3/proof?page=${p}`)}
      />
    </section>
  );
}
