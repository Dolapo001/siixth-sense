import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The badge reads the unread count through this hook; drive it directly.
let unread: number | null = null;
vi.mock("@/features/notifications/hooks", () => ({ useUnreadCount: () => unread }));
beforeEach(() => {
  unread = null;
});

import { AppRailLinks } from "./app-rail";
import { MobileNavLinks, MobileTopBar } from "./mobile-nav";
import { isActive, mobileBarNav, mobileMoreNav, primaryNav, secondaryNav, utilityNav } from "./nav-items";

describe("isActive", () => {
  it.each([
    ["/world", "/world", true],
    ["/world/abc", "/world", true],
    ["/worldwide", "/world", false],
    ["/discoveries", "/world", false],
    [null, "/world", false],
  ] as const)("%s vs %s → %s", (pathname, href, expected) => {
    expect(isActive(pathname, href)).toBe(expected);
  });
});

describe("nav config", () => {
  it("has the primary areas in the specified order", () => {
    expect(primaryNav.map((item) => item.label)).toEqual([
      "World",
      "Analyze",
      "Discover",
      "Community",
      "Leaderboard",
      "Profile",
    ]);
  });

  it("puts every destination on mobile, either in the bar or under More", () => {
    const desktop = [...primaryNav, ...secondaryNav, ...utilityNav].map((item) => item.href).sort();
    const mobile = [...mobileBarNav, ...mobileMoreNav].map((item) => item.href).sort();
    expect(mobile).toEqual(desktop);
  });
});

describe("AppRailLinks", () => {
  it("names icon-only links and marks the current page", () => {
    render(<AppRailLinks pathname="/world/vice-beach" />);
    expect(screen.getByRole("link", { name: "World" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Analyze" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("marks nothing active in the fallback", () => {
    render(<AppRailLinks pathname={null} />);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("shows no badge when there's nothing unread (or no one signed in)", () => {
    render(<AppRailLinks pathname={null} />);
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument();
  });

  it("puts the unread count on the bell, in its accessible name too", () => {
    unread = 3;
    const { unmount } = render(<AppRailLinks pathname={null} />);
    const link = screen.getByRole("link", { name: "Notifications, 3 unread" });
    expect(within(link).getByText("3")).toBeInTheDocument();
    unmount();

    unread = 12;
    render(<AppRailLinks pathname={null} />);
    expect(within(screen.getByRole("link", { name: "Notifications, 12 unread" })).getByText("9+")).toBeInTheDocument();
  });
});

describe("MobileTopBar", () => {
  it("names the bell link, with the unread count when there is one", () => {
    unread = 2;
    render(<MobileTopBar />);
    expect(screen.getByRole("link", { name: "Notifications, 2 unread" })).toHaveAttribute("href", "/notifications");
  });
});

describe("MobileNavLinks", () => {
  it("highlights More when the current page lives under it", () => {
    render(<MobileNavLinks pathname="/leaderboard" />);
    expect(screen.getByRole("button", { name: "More" })).toHaveClass("text-accent");
  });

  it("opens the More sheet with the remaining destinations", async () => {
    render(<MobileNavLinks pathname="/world" />);
    expect(screen.getByRole("link", { name: "World" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog", { name: "More" });
    for (const item of mobileMoreNav) {
      expect(within(sheet).getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
  });
});
