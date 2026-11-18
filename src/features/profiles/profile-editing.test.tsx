import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileSchema, usernameSchema } from "./schemas";

const session = vi.hoisted(() => ({ user: { username: "sample_user_1", displayName: "Sample User 1" } }));
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () => session,
}));
vi.mock("@/features/authentication/hooks", () => ({ useSession: () => ({ isPending: false, data: session }) }));
vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

describe("profile rules", () => {
  it("accepts good usernames and explains bad ones", () => {
    expect(usernameSchema.parse("  Keys_Scout7 ")).toBe("keys_scout7");
    expect(usernameSchema.safeParse("ab").error?.issues[0].message).toMatch(/At least 3/);
    expect(usernameSchema.safeParse("7up").error?.issues[0].message).toMatch(/Start with a letter/);
    expect(usernameSchema.safeParse("vice city").success).toBe(false);
    expect(usernameSchema.safeParse("rockstar").error?.issues[0].message).toMatch(/reserved/);
  });

  it("limits display name and bio, and only allows preset avatars", () => {
    const ok = { username: "scout", displayName: "Scout", bio: "", avatarId: "flamingo" };
    expect(profileSchema.safeParse(ok).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, bio: "x".repeat(161) }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, avatarId: "lucia" }).success).toBe(false);
  });
});

describe("profile editing (sample source)", () => {
  let source: Awaited<ReturnType<typeof import("./data/mock-source").createMockProfileSource>>;
  beforeEach(async () => {
    vi.resetModules();
    source = (await import("./data/mock-source")).createMockProfileSource();
  });

  it("renames an account, and the new name still leads to the same person", async () => {
    const saved = await source.updateProfile({
      username: "keys_scout",
      displayName: "Keys Scout",
      bio: "Mapping the Keys.",
      avatarId: "lighthouse",
    });
    expect(saved).toMatchObject({ username: "keys_scout", displayName: "Keys Scout", avatarId: "lighthouse" });
    expect(await source.getProfile("keys_scout")).toMatchObject({ viewerIsOwner: true, bio: "Mapping the Keys." });
    expect((await source.checkUsername("keys_scout")).available).toBe(true); // your own name
  });

  it("refuses a name another player uses", async () => {
    expect(await source.checkUsername("sample_user_2")).toEqual({ available: false, reason: "That username is taken." });
    await expect(
      source.updateProfile({ username: "sample_user_2", displayName: "Copycat", bio: null, avatarId: null }),
    ).rejects.toThrow(/taken/);
    await expect(
      source.updateProfile({ username: "fine_name", displayName: "X", bio: null, avatarId: null }),
    ).rejects.toThrow(/At least 2/);
  });
});

describe("ProfileEditor", () => {
  it("picks an avatar, checks the username live, and saves", async () => {
    vi.resetModules();
    const { ProfileEditor } = await import("./profile-editor");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProfileEditor />
      </QueryClientProvider>,
    );
    const username = await screen.findByLabelText(/Username/);
    await userEvent.click(screen.getByRole("radio", { name: "Flamingo" }));
    await userEvent.clear(username);
    await userEvent.paste("sample_user_2");
    expect(await screen.findByText("Taken")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();

    await userEvent.clear(username);
    await userEvent.paste("flamingo_fan");
    expect(await screen.findByText("Available")).toBeInTheDocument();
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("@flamingo_fan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByRole("link", { name: "View your profile" })).toHaveAttribute("href", "/profile/flamingo_fan");
  });
});
