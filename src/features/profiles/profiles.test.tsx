import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __sample } from "@/features/discoveries/data/mock-source";
import { createMockProfileSource, sampleReputation } from "./data/mock-source";

vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

let signedIn = true;
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () =>
    signedIn ? { user: { username: "sample_viewer", displayName: "You (sample viewer)" } } : null,
}));

let search = "";
let pathname = "/leaderboard";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

const { ProfileView } = await import("./profile-view");
const { OwnProfile } = await import("./own-profile");
const { LeaderboardView, parseLeaderboardParams } = await import("@/features/leaderboard/leaderboard-view");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  signedIn = true;
  search = "";
  pathname = "/leaderboard";
});

describe("sample profile data", () => {
  it("counts submitted and verified discoveries consistently with the feed", async () => {
    const profile = (await createMockProfileSource().getProfile("sample_user_1"))!;
    const mine = __sample.items.filter((i) => i.contributor.username === "sample_user_1");
    expect(profile.stats.submitted).toBe(mine.length);
    expect(profile.stats.verified).toBe(mine.filter((i) => i.verification === "verified").length);
    expect(profile.stats.verified).toBeLessThanOrEqual(profile.stats.submitted);
  });

  it("weights reputation toward verified work and never goes negative", () => {
    const base = { submitted: 10, verified: 0, reviews: 0, comments: 0 };
    expect(sampleReputation({ ...base, verified: 1 }, 0)).toBeGreaterThan(sampleReputation({ ...base, reviews: 1 }, 0));
    // Uploads alone earn nothing.
    expect(sampleReputation({ ...base, submitted: 50 }, 0)).toBe(0);
    expect(sampleReputation(base, 10)).toBe(0);
  });

  it("never marks a sample wallet as verified", async () => {
    const profile = (await createMockProfileSource().getProfile("sample_user_2"))!;
    expect(profile.wallet).toMatchObject({ verified: false });
  });

  it("returns null for unknown users", async () => {
    expect(await createMockProfileSource().getProfile("nobody")).toBeNull();
  });
});

describe("sample leaderboard", () => {
  it("ranks by the chosen dimension, sharing ranks on ties", async () => {
    const board = await createMockProfileSource().getLeaderboard({ dimension: "verified", period: "all" });
    const values = board.entries.map((e) => e.verified);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    board.entries.forEach((entry, i) => {
      if (i > 0 && entry.verified === board.entries[i - 1].verified) expect(entry.rank).toBe(board.entries[i - 1].rank);
      else expect(entry.rank).toBe(i + 1);
    });
  });

  it("leaves out contributors with nothing in the period", async () => {
    const board = await createMockProfileSource().getLeaderboard({ dimension: "reviews", period: "all" });
    expect(board.entries.every((e) => e.reviews > 0)).toBe(true);
  });

  it("counts less in a shorter period", async () => {
    const source = createMockProfileSource(() => Date.UTC(2026, 10, 17));
    const sum = async (period: "week" | "all") =>
      (await source.getLeaderboard({ dimension: "verified", period })).entries.reduce((n, e) => n + e.verified, 0);
    expect(await sum("week")).toBeLessThanOrEqual(await sum("all"));
  });

  it("parses options leniently from the URL", () => {
    expect(parseLeaderboardParams(new URLSearchParams(""))).toEqual({ dimension: "verified", period: "month" });
    expect(parseLeaderboardParams(new URLSearchParams("by=reviews&period=all"))).toEqual({
      dimension: "reviews",
      period: "all",
    });
    expect(parseLeaderboardParams(new URLSearchParams("by=uploads&period=decade"))).toEqual({
      dimension: "verified",
      period: "month",
    });
  });
});

describe("ProfileView", () => {
  it("shows reputation and keeps submitted and verified apart", async () => {
    pathname = "/profile/sample_user_1";
    withQuery(<ProfileView username="sample_user_1" />);
    expect(await screen.findByRole("heading", { name: "Sample User 1", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Reputation")).toBeInTheDocument();
    const stats = screen.getByRole("heading", { name: "Contributions" }).parentElement!;
    expect(within(stats).getByText("Verified discoveries")).toBeInTheDocument();
    expect(within(stats).getByText("Submitted")).toBeInTheDocument();
    expect(within(stats).getByText(/of \d+ submitted/)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Discovery lists" });
    expect(within(nav).getByRole("link", { name: "Submitted" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Verified" })).toHaveAttribute(
      "href",
      "/profile/sample_user_1?tab=verified",
    );
  });

  it("lists only verified discoveries on the Verified tab", async () => {
    pathname = "/profile/sample_user_1";
    search = "tab=verified";
    withQuery(<ProfileView username="sample_user_1" />);
    await screen.findByRole("heading", { name: "Sample User 1", level: 1 });
    await screen.findAllByRole("article");
    const statuses = [...document.querySelectorAll("article [data-status]")].map((b) => b.getAttribute("data-status"));
    expect(new Set(statuses)).toEqual(new Set(["verified"]));
  });

  it("shows a wallet as not verified", async () => {
    pathname = "/profile/sample_user_2";
    withQuery(<ProfileView username="sample_user_2" />);
    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    expect(screen.queryByText("Wallet verified")).not.toBeInTheDocument();
  });

  it("says when a contributor doesn't exist", async () => {
    withQuery(<ProfileView username="nobody" />);
    expect(await screen.findByRole("heading", { name: "Contributor not found" })).toBeInTheDocument();
  });
});

describe("OwnProfile", () => {
  it("asks signed-out visitors to sign in", async () => {
    signedIn = false;
    withQuery(<OwnProfile />);
    expect(await screen.findByRole("heading", { name: "Sign in to see your profile" })).toBeInTheDocument();
  });

  it("shows the viewer's own profile, marked as theirs", async () => {
    pathname = "/profile";
    withQuery(<OwnProfile />);
    expect(await screen.findByRole("heading", { name: "You (sample viewer)", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    // The sample viewer owns a few sample discoveries.
    expect((await screen.findAllByRole("article")).length).toBeGreaterThan(0);
  });
});

describe("LeaderboardView", () => {
  it("defaults to verified discoveries this month and links to profiles", async () => {
    search = "period=all";
    withQuery(<LeaderboardView />);
    const table = await screen.findByRole("table", { name: /ranked by verified discoveries, all time/i });
    expect(within(table).getByRole("columnheader", { name: "Verified" })).toHaveAttribute("aria-sort", "descending");
    const firstLink = within(table).getAllByRole("link")[0];
    expect(firstLink.getAttribute("href")).toMatch(/^\/profile\/sample_user_\d$/);
    expect(screen.getByText(/uploads on their own don.t earn a ranking/)).toBeInTheDocument();
  });

  it("switches dimension from the URL and never offers upload count", async () => {
    search = "by=reviews&period=all";
    withQuery(<LeaderboardView />);
    const nav = await screen.findByRole("navigation", { name: "Rank by" });
    expect(within(nav).getByRole("link", { name: "Verification activity" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByText(/upload/i)).not.toBeInTheDocument();
  });
});
