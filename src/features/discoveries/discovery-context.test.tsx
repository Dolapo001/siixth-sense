import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getLocationDetail } from "@/features/world/data/gtadb.server";
import { DiscoveryLocationCard, DiscoverySources } from "./discovery-context";
import type { DiscoveryDetail } from "./types";

// Location lookups read the real GTA VI snapshot, without going through HTTP.
vi.mock("@/features/world/data/source", () => ({
  getWorldDataSource: async () => ({ kind: "snapshot", getLocation: async (id: string) => getLocationDetail(id) }),
}));

const discovery = (overrides: Partial<DiscoveryDetail> = {}) =>
  ({
    id: "d1",
    title: "Coupe outside the hotel",
    category: "vehicle",
    verification: "awaiting_verification",
    submittedAt: "2026-11-18T10:00:00Z",
    contributor: { username: "someone", displayName: "Someone" },
    location: { locationId: "L1", name: "Vice Regal", regionId: null, regionName: "Vice Beach", precision: "approximate" },
    ...overrides,
  }) as DiscoveryDetail;

const withQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("DiscoveryLocationCard", () => {
  it("shows the place on the GTA map with its areas and a link into the World Explorer", async () => {
    withQuery(<DiscoveryLocationCard discovery={discovery()} />);
    expect(await screen.findByRole("img", { name: "Map around Vice Regal" })).toBeInTheDocument();
    expect(screen.getByText("Washington Beach · Vice Beach")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in the World Explorer/ })).toHaveAttribute("href", "/world/L1");
  });

  it("invites help when there's no location", () => {
    withQuery(<DiscoveryLocationCard discovery={discovery({ location: null })} />);
    expect(screen.getByText(/No location yet/)).toBeInTheDocument();
  });
});

describe("DiscoverySources", () => {
  it("credits the community map for location data and is clear about AI vs community", async () => {
    withQuery(<DiscoverySources discovery={discovery()} />);
    expect(await screen.findByRole("link", { name: /gtadb\.org/ })).toHaveAttribute("href", "https://map.gtadb.org");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toBeInTheDocument();
    expect(screen.getByText(/Not confirmed by reviewers yet/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing here comes from Rockstar Games/)).toBeInTheDocument();
  });

  it("says when reviewers have confirmed it", () => {
    withQuery(<DiscoverySources discovery={discovery({ verification: "verified", location: null })} />);
    expect(screen.getByText("Confirmed by community reviewers.")).toBeInTheDocument();
  });
});
