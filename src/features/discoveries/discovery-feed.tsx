"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DiscoveryFilters } from "@/components/discoveries/discovery-filters";
import { DiscoveryLead, DiscoveryRow } from "@/components/discoveries/discovery-items";
import { Pagination } from "@/components/discoveries/pagination";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utilities/cn";
import type { DiscoveryDataSource } from "./data/source";
import { useDiscoveries, useDiscoveryRegions, useDiscoverySource } from "./hooks";
import { defaultQuery, isFiltered, parseDiscoveryQuery, serializeDiscoveryQuery, type DiscoveryQuery } from "./query";

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Community intelligence"
      title="Discoveries"
      description="Screenshots and findings shared by the community, with their verification status."
      actions={
        sample ? (
          <Badge tone="signal" className="self-start">
            Sample data
          </Badge>
        ) : undefined
      }
    />
  );
}

export function DiscoveryFeed() {
  const source = useDiscoverySource();
  if (source.isPending) {
    return (
      <PageContainer>
        <Header sample={false} />
        <LoadingState label="Loading discoveries" />
      </PageContainer>
    );
  }
  if (source.isError) {
    return (
      <PageContainer>
        <Header sample={false} />
        <ErrorState onRetry={() => source.refetch()} />
      </PageContainer>
    );
  }
  if (!source.data) {
    return (
      <PageContainer>
        <Header sample={false} />
        <UnavailableState description="Discoveries load from the Sixth Sense backend, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Feed source={source.data} />;
}

function Feed({ source }: { source: DiscoveryDataSource }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseDiscoveryQuery(new URLSearchParams(searchParams.toString()));
  const regions = useDiscoveryRegions(source);
  const list = useDiscoveries(source, query);

  const hrefFor = (next: DiscoveryQuery) => {
    const qs = serializeDiscoveryQuery(next);
    return qs ? `${pathname}?${qs}` : pathname;
  };
  // Filter changes replace history; page links push (see Pagination).
  const applyQuery = (next: DiscoveryQuery) => router.replace(hrefFor(next), { scroll: false });

  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  // Lead story only on the unfiltered first page in date order.
  const showLead = !!data && data.page === 1 && !isFiltered(query) && query.sort === "newest" && data.items.length > 0;
  const [lead, ...rest] = data?.items ?? [];
  const rows = showLead ? rest : (data?.items ?? []);

  return (
    <PageContainer>
      <Header sample={source.kind === "sample"} />
      <DiscoveryFilters query={query} regions={regions.data ?? []} onChange={applyQuery} />

      <p className="sr-only" role="status" aria-live="polite">
        {data ? `${data.total} discoveries found.` : ""}
      </p>

      {list.isPending ? (
        <LoadingState label="Loading discoveries" />
      ) : list.isError ? (
        <ErrorState
          description="Discoveries didn't load. Check your connection and try again."
          onRetry={() => list.refetch()}
        />
      ) : data!.total === 0 ? (
        <EmptyState
          title={isFiltered(query) ? "No discoveries match" : "No discoveries yet"}
          description={
            isFiltered(query)
              ? "Try a different search or fewer filters."
              : "Be the first: analyze a screenshot and share what you find."
          }
          action={
            isFiltered(query)
              ? { label: "Clear filters", href: hrefFor({ ...defaultQuery, sort: query.sort }) }
              : { label: "Analyze a screenshot", href: "/analyze" }
          }
        />
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", list.isPlaceholderData && "opacity-80")} aria-busy={list.isPlaceholderData}>
          <p className="meta text-muted">
            {data!.total} {data!.total === 1 ? "discovery" : "discoveries"}
          </p>
          {showLead && <DiscoveryLead item={lead} />}
          <div className="divide-y divide-border border-y border-border">
            {rows.map((item) => (
              <DiscoveryRow key={item.id} item={item} />
            ))}
          </div>
          <Pagination page={data!.page} totalPages={totalPages} hrefFor={(page) => hrefFor({ ...query, page })} />
        </div>
      )}
    </PageContainer>
  );
}
