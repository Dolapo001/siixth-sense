import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The source loads but the page's own list request fails: each page shows an
 * error with a retry, and retrying recovers. Wraps the sample sources so only
 * the list call can fail.
 */

vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () => ({ user: { username: "sample_viewer", displayName: "You (sample viewer)" } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams("period=all"),
}));

const fails = { leaderboard: false, queue: false, rewards: false };
const calls = { leaderboard: 0, queue: 0, rewards: 0 };
const failing = <T,>(key: keyof typeof fails, call: () => Promise<T>) => {
  calls[key] += 1;
  return fails[key] ? Promise.reject(new Error("network")) : call();
};

vi.mock("@/features/profiles/data/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/profiles/data/source")>();
  return {
    ...actual,
    getProfileDataSource: async () => {
      const source = (await actual.getProfileDataSource())!;
      return { ...source, getLeaderboard: (...args: Parameters<typeof source.getLeaderboard>) => failing("leaderboard", () => source.getLeaderboard(...args)) };
    },
  };
});
vi.mock("@/features/discoveries/data/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/discoveries/data/source")>();
  return {
    ...actual,
    getDiscoveryDataSource: async () => {
      const source = (await actual.getDiscoveryDataSource())!;
      return { ...source, listDiscoveries: (...args: Parameters<typeof source.listDiscoveries>) => failing("queue", () => source.listDiscoveries(...args)) };
    },
  };
});
vi.mock("@/features/web3/data/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/web3/data/source")>();
  return {
    ...actual,
    getWeb3DataSource: async () => {
      const source = (await actual.getWeb3DataSource())!;
      return { ...source, getRewards: () => failing("rewards", () => source.getRewards()) };
    },
  };
});

const { LeaderboardView } = await import("@/features/leaderboard/leaderboard-view");
const { CommunityHub } = await import("@/features/community/community-hub");
const { RewardsView } = await import("@/features/rewards/rewards-view");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  for (const key of Object.keys(fails) as (keyof typeof fails)[]) {
    fails[key] = false;
    calls[key] = 0;
  }
});

/** Waits for the failed list, retries with the failure cleared, and checks it recovered. */
async function failThenRecover(key: keyof typeof fails, recovered: () => Promise<unknown>) {
  const retry = await screen.findByRole("button", { name: "Try again" });
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  expect(calls[key]).toBe(1);
  fails[key] = false;
  await userEvent.click(retry);
  await recovered();
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(calls[key]).toBe(2);
}

describe("list errors recover on retry", () => {
  it("leaderboard", async () => {
    fails.leaderboard = true;
    withQuery(<LeaderboardView />);
    await failThenRecover("leaderboard", () => screen.findByRole("table", { name: /ranked by verified discoveries/i }));
  });

  it("community hub review queue", async () => {
    fails.queue = true;
    withQuery(<CommunityHub />);
    await failThenRecover("queue", () => screen.findByText(/in queue/));
  });

  it("rewards", async () => {
    fails.rewards = true;
    withQuery(<RewardsView />);
    await failThenRecover("rewards", () => screen.findByText("How eligibility works"));
  });
});
