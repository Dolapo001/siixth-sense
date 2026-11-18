import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryFilters } from "@/components/discoveries/discovery-filters";
import { Pagination } from "@/components/discoveries/pagination";
import { discoveryCategories } from "@/features/world/types";
import type { DiscoveryDataSource } from "./data/source";
import { queryDiscoveries } from "./data/mock-source";
import { defaultQuery, type DiscoveryQuery } from "./query";
import type { DiscoveryDetail, DiscoveryListItem } from "./types";

// --- Next navigation mock: the URL is the feed's state. ---
let currentSearch = "";
const replace = vi.fn((href: string) => {
  currentSearch = href.split("?")[1] ?? "";
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/discoveries",
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const item = (n: number): DiscoveryListItem => ({
  id: `d${n}`,
  title: `Sample discovery ${n}`,
  category: n % 2 ? "vehicle" : "wildlife",
  verification: n % 3 ? "ai_suggested" : "verified",
  submittedAt: new Date(Date.UTC(2026, 10, 1 + n)).toISOString(),
  contributor: { username: "sample_user_1", displayName: "Sample User 1" },
  location: {
    locationId: "sample-01",
    name: "Sample Location 01",
    regionId: "r1",
    regionName: "Sample Region North",
    precision: "confirmed",
  },
  screenshot: null,
  engagement: { comments: n, confirmations: 0 },
});
const items = Array.from({ length: 40 }, (_, i) => item(i + 1));

const detail: DiscoveryDetail = {
  ...item(1),
  description: "Sample description.",
  detections: [],
  evidence: [],
  suggestions: [],
  viewer: null,
  verificationProgress: null,
  verificationHistory: [{ at: "2026-11-02T00:00:00Z", status: "ai_suggested", actor: { kind: "ai" } }],
  comments: [],
  related: [],
  attestation: null,
};

let listFails = false;
let detailFails = false;
const listDiscoveries = vi.fn(async (query: DiscoveryQuery) => {
  if (listFails) throw new Error("network");
  return queryDiscoveries(items, query);
});
const getDiscovery = vi.fn(async () => {
  if (detailFails) throw new Error("network");
  return detail;
});

const fakeSource: DiscoveryDataSource = {
  kind: "sample",
  listDiscoveries,
  getDiscovery,
  listRegions: async () => [{ id: "r1", name: "Sample Region North", bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } }],
  addComment: vi.fn(),
  suggestIdentification: vi.fn(),
  addEvidence: vi.fn(),
  vote: vi.fn(),
  report: vi.fn(),
  setFollowing: vi.fn(),
  submitDiscovery: vi.fn(),
};
vi.mock("./data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./data/source")>()),
  getDiscoveryDataSource: async () => fakeSource,
}));

const { DiscoveryFeed } = await import("./discovery-feed");
const { DiscoveryDetailView } = await import("./discovery-detail");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  currentSearch = "";
  replace.mockClear();
  listDiscoveries.mockClear();
  getDiscovery.mockClear();
  listFails = false;
  detailFails = false;
});

describe("DiscoveryFeed failures", () => {
  it("shows an error when the list fails, and Try again recovers", async () => {
    listFails = true;
    withQuery(<DiscoveryFeed />);
    expect(await screen.findByText("Discoveries didn't load. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.queryByText("40 discoveries")).not.toBeInTheDocument();

    listFails = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("40 discoveries")).toBeInTheDocument();
    expect(screen.queryByText(/Discoveries didn't load/)).not.toBeInTheDocument();
    expect(listDiscoveries).toHaveBeenCalledTimes(2);
  });
});

describe("DiscoveryDetailView failures", () => {
  it("says the discovery didn't load, and Try again recovers", async () => {
    detailFails = true;
    withQuery(<DiscoveryDetailView id="d1" />);
    expect(await screen.findByText("This discovery didn't load.")).toBeInTheDocument();

    detailFails = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Sample discovery 1", level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("This discovery didn't load.")).not.toBeInTheDocument();
    expect(getDiscovery).toHaveBeenCalledTimes(2);
  });
});

describe("Pagination links", () => {
  it("links to the neighbouring pages and disables next on the last page", () => {
    const hrefFor = (p: number) => `/x?page=${p}`;
    const { rerender } = render(<Pagination page={2} totalPages={3} hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/x?page=1");
    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("rel", "prev");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/x?page=3");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("rel", "next");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    rerender(<Pagination page={3} totalPages={3} hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: /Next/ })).not.toBeInTheDocument();
  });

  it("keeps filters in the feed's page links and drops page=1 from the URL", async () => {
    currentSearch = "sort=oldest&page=2";
    withQuery(<DiscoveryFeed />);
    const nav = await screen.findByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByText("Page 2 of 4")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/discoveries?sort=oldest");
    expect(within(nav).getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/discoveries?sort=oldest&page=3",
    );
  });
});

describe("DiscoveryFilters", () => {
  const onPage3: DiscoveryQuery = { ...defaultQuery, page: 3 };
  const regions = [{ id: "r1", name: "Sample Region North", bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } }];

  it("resets to page 1 when the region, sort or a category changes", async () => {
    const onChange = vi.fn();
    render(<DiscoveryFilters query={onPage3} regions={regions} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Region"), "r1");
    expect(onChange).toHaveBeenLastCalledWith({ ...onPage3, regionId: "r1", page: 1 });

    await userEvent.selectOptions(screen.getByLabelText("Sort"), "discussed");
    expect(onChange).toHaveBeenLastCalledWith({ ...onPage3, sort: "discussed", page: 1 });

    await userEvent.click(screen.getByRole("button", { name: /Vehicles/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...onPage3,
      categories: discoveryCategories.filter((c) => c !== "vehicle"),
      page: 1,
    });
  });

  it("removes the contributor filter and clears all filters but keeps the sort", async () => {
    const onChange = vi.fn();
    const filtered: DiscoveryQuery = {
      ...defaultQuery,
      contributor: "sample_user_1",
      verification: "verified",
      sort: "oldest",
      page: 2,
    };
    render(<DiscoveryFilters query={filtered} regions={regions} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /remove contributor filter/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...filtered, contributor: null, page: 1 });

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultQuery, sort: "oldest" });
  });

  it("writes a category change from page 3 to the URL without a page", async () => {
    currentSearch = "page=3";
    withQuery(<DiscoveryFeed />);
    await screen.findByText("40 discoveries");
    // Turning one category off from the all-on state filters to the rest.
    await userEvent.click(screen.getByRole("button", { name: /Wildlife/ }));
    const href = replace.mock.lastCall![0];
    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/discoveries?")).toBe(true);
    expect(params.get("page")).toBeNull();
    expect(params.get("category")?.split(",")).toEqual(discoveryCategories.filter((c) => c !== "wildlife"));
    expect(replace).toHaveBeenLastCalledWith(href, { scroll: false });
  });
});
