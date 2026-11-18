import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingNav } from "./landing-nav";

const session = vi.hoisted(() => ({ data: null as unknown }));
vi.mock("@/features/authentication/hooks", () => ({ useSession: () => session }));

// jsdom has no IntersectionObserver; the nav only uses it for highlighting.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

describe("LandingNav account link", () => {
  beforeEach(() => {
    session.data = null;
  });

  it("offers Sign in when nobody is signed in", () => {
    render(<LandingNav />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("shows no account button once signed in", () => {
    session.data = { user: { username: "someone", displayName: "Someone" } };
    render(<LandingNav />);
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });
});

describe("LandingNav sections", () => {
  it("only links to sections on the landing page, never into the app", () => {
    render(<LandingNav />);
    const sections = screen.getAllByRole("navigation", { name: "Sections" })[0];
    for (const link of sections.querySelectorAll("a")) {
      expect(link.getAttribute("href")).toMatch(/^#/);
    }
  });
});
