import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/discoveries/pagination";
import { VerificationTimeline } from "@/components/discoveries/verification-timeline";
import type { DiscoveryDataSource } from "./data/source";
import { queryDiscoveries } from "./data/mock-source";
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

const item = (n: number, overrides: Partial<DiscoveryListItem> = {}): DiscoveryListItem => ({
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
  ...overrides,
});
const items = Array.from({ length: 30 }, (_, i) => item(i + 1));

const detail = (overrides: Partial<DiscoveryDetail> = {}): DiscoveryDetail => ({
  ...item(1),
  description: "Sample description.",
  detections: [
    { id: "x", label: "Sample vehicle 1", category: "vehicle", confidence: 0.9, verification: "ai_suggested" },
  ],
  evidence: [],
  suggestions: [],
  viewer: null,
  verificationHistory: [{ at: "2026-11-02T00:00:00Z", status: "ai_suggested", actor: { kind: "ai" } }],
  comments: [],
  related: [],
  attestation: null,
  ...overrides,
});

let detailResult: DiscoveryDetail | null = detail();
const fakeSource: DiscoveryDataSource = {
  kind: "sample",
  listDiscoveries: async (query) => queryDiscoveries(items, query),
  getDiscovery: async () => detailResult,
  listRegions: async () => [{ id: "r1", name: "Sample Region North", bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } }],
  // Community actions are covered in community.test.tsx.
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
  detailResult = detail();
});

describe("DiscoveryFeed", () => {
  it("shows a lead story and a page of rows, with pagination", async () => {
    withQuery(<DiscoveryFeed />);
    expect(await screen.findByText("Latest discovery")).toBeInTheDocument();
    expect(screen.getByText("30 discoveries")).toBeInTheDocument();
    // Lead + 11 rows = one page of 12.
    expect(screen.getAllByRole("article")).toHaveLength(12);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByText("Page 1 of 3")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/discoveries?page=2");
  });

  it("writes filters to the URL and resets to page 1", async () => {
    currentSearch = "page=2";
    withQuery(<DiscoveryFeed />);
    await screen.findByText("30 discoveries");
    await userEvent.selectOptions(screen.getByLabelText("Verification status"), "verified");
    expect(replace).toHaveBeenLastCalledWith("/discoveries?status=verified", { scroll: false });
  });

  it("debounces search into the URL", async () => {
    withQuery(<DiscoveryFeed />);
    await screen.findByText("30 discoveries");
    await userEvent.type(screen.getByRole("searchbox", { name: "Search discoveries" }), "discovery 7");
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/discoveries?q=discovery+7", { scroll: false }));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("reads filters from the URL and drops the lead when filtered", async () => {
    currentSearch = "category=wildlife";
    withQuery(<DiscoveryFeed />);
    expect(await screen.findByText("15 discoveries")).toBeInTheDocument();
    expect(screen.queryByText("Latest discovery")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vehicles/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("explains an empty result and offers to clear filters", async () => {
    currentSearch = "q=nothing-matches";
    withQuery(<DiscoveryFeed />);
    expect(await screen.findByRole("heading", { name: "No discoveries match" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/discoveries");
  });
});

describe("DiscoveryDetailView", () => {
  it("shows status, detections, history and location context", async () => {
    withQuery(<DiscoveryDetailView id="d1" />);
    expect(await screen.findByRole("heading", { name: "Sample discovery 1", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Sample vehicle 1")).toBeInTheDocument();
    expect(screen.getByText("Sixth Sense analysis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in the World Explorer/ })).toHaveAttribute("href", "/world/sample-01");
    expect(screen.getByText("Not recorded on-chain.")).toBeInTheDocument();
    expect(screen.getByText(/doesn't prove the\s+discovery is correct/)).toBeInTheDocument();
  });

  it("shows an attestation without calling it verification", async () => {
    detailResult = detail({
      verification: "verified",
      attestation: {
        network: "Solana devnet (sample)",
        signature: "SIG123",
        explorerUrl: "https://example.test",
        recordedAt: "2026-11-03T00:00:00Z",
      },
    });
    withQuery(<DiscoveryDetailView id="d1" />);
    expect(await screen.findByText("SIG123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View in explorer/ })).toHaveAttribute("target", "_blank");
  });

  it("handles a discovery with no known location", async () => {
    detailResult = detail({ location: null });
    withQuery(<DiscoveryDetailView id="d1" />);
    expect(await screen.findByText(/No location yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open in the World Explorer/ })).not.toBeInTheDocument();
  });

  it("says when a discovery doesn't exist", async () => {
    detailResult = null;
    withQuery(<DiscoveryDetailView id="missing" />);
    expect(await screen.findByRole("heading", { name: "Discovery not found" })).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("greys out previous on the first page and hides when there's one page", () => {
    const { rerender } = render(<Pagination page={1} totalPages={2} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.queryByRole("link", { name: /Previous/ })).not.toBeInTheDocument();
    // Shown greyed out for sighted users, but hidden from assistive tech (there's nothing to activate).
    expect(screen.getByText("Previous").closest("[aria-hidden]")).toBeInTheDocument();
    rerender(<Pagination page={1} totalPages={1} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("VerificationTimeline", () => {
  it("names who changed the status", () => {
    render(
      <VerificationTimeline
        events={[
          { at: "2026-11-01T00:00:00Z", status: "ai_suggested", actor: { kind: "ai" } },
          {
            at: "2026-11-02T00:00:00Z",
            status: "disputed",
            actor: { kind: "member", username: "sample_user_2" },
            note: "Wrong model.",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "@sample_user_2" })).toHaveAttribute("href", "/profile/sample_user_2");
    expect(screen.getByText(/Wrong model\./)).toBeInTheDocument();
    expect(screen.getByText("Disputed")).toBeInTheDocument();
  });
});
