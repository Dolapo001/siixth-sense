"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorldDataSource, type WorldDataSource } from "./data/source";

const worldKeys = {
  source: ["world", "source"] as const,
  overview: ["world", "overview"] as const,
  location: (id: string) => ["world", "location", id] as const,
};

function useWorldSource() {
  return useQuery({ queryKey: worldKeys.source, queryFn: getWorldDataSource, staleTime: Infinity });
}

/** Bounds, regions and markers in one query, since the map needs all three to render. */
export function useWorldOverview() {
  const source = useWorldSource();
  const overview = useQuery({
    queryKey: worldKeys.overview,
    enabled: !!source.data,
    queryFn: async () => {
      const s = source.data as WorldDataSource;
      const [bounds, regions, markers] = await Promise.all([s.getWorldBounds(), s.listRegions(), s.listMarkers()]);
      return { bounds, regions, markers, kind: s.kind };
    },
  });

  return {
    /** No data source configured (e.g. production before the API exists). */
    unavailable: source.isSuccess && source.data === null,
    isPending: source.isPending || (!!source.data && overview.isPending),
    isError: source.isError || overview.isError,
    refetch: () => (source.isError ? source.refetch() : overview.refetch()),
    data: overview.data,
  };
}

export function useLocation(id: string | null) {
  const source = useWorldSource();
  return useQuery({
    queryKey: worldKeys.location(id ?? ""),
    enabled: !!source.data && !!id,
    queryFn: () => (source.data as WorldDataSource).getLocation(id!),
  });
}
