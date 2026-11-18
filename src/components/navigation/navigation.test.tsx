import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppRailLinks } from "./app-rail";
import { MobileNavLinks } from "./mobile-nav";
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
