import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
 * With no backend connected, every data source resolves to null and each page
 * must say so plainly instead of loading forever or showing an error.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/discoveries/data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/discoveries/data/source")>()),
  getDiscoveryDataSource: async () => null,
}));
vi.mock("@/features/profiles/data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/profiles/data/source")>()),
  getProfileDataSource: async () => null,
}));
vi.mock("@/features/web3/data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/web3/data/source")>()),
  getWeb3DataSource: async () => null,
}));
vi.mock("@/features/image-analysis/data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/image-analysis/data/source")>()),
  getAnalysisDataSource: async () => null,
}));

const { DiscoveryFeed } = await import("@/features/discoveries/discovery-feed");
const { DiscoveryDetailView } = await import("@/features/discoveries/discovery-detail");
const { CommunityHub } = await import("@/features/community/community-hub");
const { LeaderboardView } = await import("@/features/leaderboard/leaderboard-view");
const { ProfileView } = await import("@/features/profiles/profile-view");
const { RewardsView } = await import("@/features/rewards/rewards-view");
const { AnalyzeExperience } = await import("@/features/image-analysis/analyze-experience");

const cases: [string, React.ReactNode, string][] = [
  ["discoveries feed", <DiscoveryFeed key="feed" />, "Discoveries load from the Sixth Sense backend, which isn't connected yet."],
  [
    "discovery detail",
    <DiscoveryDetailView key="detail" id="d1" />,
    "Discovery details load from the Sixth Sense backend, which isn't connected yet.",
  ],
  ["community hub", <CommunityHub key="hub" />, "Community features need the Sixth Sense backend, which isn't connected yet."],
  ["leaderboard", <LeaderboardView key="board" />, "Rankings come from the Sixth Sense backend, which isn't connected yet."],
  [
    "profile view",
    <ProfileView key="profile" username="sample_user_1" />,
    "Profiles load from the Sixth Sense backend, which isn't connected yet.",
  ],
  ["rewards", <RewardsView key="rewards" />, "Rewards come from the Sixth Sense backend, which isn't connected yet."],
  [
    "analyze",
    <AnalyzeExperience key="analyze" />,
    "Screenshot analysis needs the Sixth Sense analysis service, which isn't connected yet.",
  ],
];

describe("pages with no backend connected", () => {
  it.each(cases)("%s says the backend isn't connected", async (_name, ui, description) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
    expect(await screen.findByText(description)).toBeInTheDocument();
    expect(screen.getByText("Not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sample data")).not.toBeInTheDocument();
  });
});
