import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultQuery } from "@/features/discoveries/query";

const session = vi.hoisted(() => ({ user: { username: "sample_user_1", displayName: "Sample User 1" } }));
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () => session,
}));

describe("a profile edit shows everywhere (sample data)", () => {
  beforeEach(() => vi.resetModules());

  it("updates the leaderboard, the feed and discovery pages", async () => {
    const profiles = (await import("./data/mock-source")).createMockProfileSource();
    const discoveries = (await import("@/features/discoveries/data/mock-source")).createMockDiscoverySource();

    await profiles.updateProfile({ username: "neon_scout", displayName: "Neon Scout", bio: null, avatarId: "neon" });

    const board = await profiles.getLeaderboard({ dimension: "verified", period: "all" });
    expect(board.entries.find((e) => e.username === "neon_scout")).toMatchObject({
      displayName: "Neon Scout",
      avatarId: "neon",
    });
    expect(board.entries.some((e) => e.username === "sample_user_1")).toBe(false);

    // The new name finds their discoveries, presented with the new name and avatar.
    const page = await discoveries.listDiscoveries({ ...defaultQuery, contributor: "neon_scout" });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((item) => item.contributor.avatarId === "neon")).toBe(true);

    const detail = await discoveries.getDiscovery(page.items[0].id);
    expect(detail?.contributor).toMatchObject({ username: "neon_scout", displayName: "Neon Scout", avatarId: "neon" });
  });

  it("gives other sample contributors a stable preset avatar", async () => {
    const profiles = (await import("./data/mock-source")).createMockProfileSource();
    const a = await profiles.getLeaderboard({ dimension: "verified", period: "all" });
    const b = await profiles.getLeaderboard({ dimension: "verified", period: "all" });
    expect(a.entries.every((e) => e.avatarId)).toBe(true);
    expect(a.entries.map((e) => e.avatarId)).toEqual(b.entries.map((e) => e.avatarId));
  });
});
