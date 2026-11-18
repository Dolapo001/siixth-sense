"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDiscoveryDataSource, type DiscoveryDataSource } from "./data/source";
import type { DiscoveryQuery } from "./query";

export function useDiscoverySource() {
  return useQuery({ queryKey: ["discoveries", "source"], queryFn: getDiscoveryDataSource, staleTime: Infinity });
}

export function useDiscoveries(source: DiscoveryDataSource, query: DiscoveryQuery) {
  return useQuery({
    queryKey: ["discoveries", "list", query],
    queryFn: ({ signal }) => source.listDiscoveries(query, signal),
    // Keep showing the current page while the next one loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useDiscovery(source: DiscoveryDataSource, id: string) {
  return useQuery({
    queryKey: ["discoveries", "detail", id],
    queryFn: ({ signal }) => source.getDiscovery(id, signal),
  });
}

export function useDiscoveryRegions(source: DiscoveryDataSource) {
  return useQuery({ queryKey: ["discoveries", "regions"], queryFn: () => source.listRegions(), staleTime: Infinity });
}
