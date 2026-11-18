import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  demoDetections,
  exampleDiscoveries,
  exampleRankings,
  landingImages,
  mapMarkers,
} from "@/features/landing/fixtures";
import { LeaderboardPreview } from "./leaderboard-preview";
import { MapPreview } from "./map-preview";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => <img {...props} />,
}));

describe("landing fixtures", () => {
  it("only references images that exist", () => {
    for (const image of Object.values(landingImages)) {
      expect(existsSync(join(process.cwd(), "public", image.src)), image.src).toBe(true);
      expect(image.alt.length).toBeGreaterThan(20);
    }
  });

  it("keeps demo detection boxes inside the image", () => {
    for (const { box } of demoDetections) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1);
      expect(box.y + box.height).toBeLessThanOrEqual(1);
    }
  });

  it("places markers on the illustrative map, with radii for approximate ones", () => {
    for (const marker of mapMarkers) {
      expect(marker.x).toBeGreaterThan(0);
      expect(marker.x).toBeLessThan(1000);
      expect(marker.y).toBeGreaterThan(0);
      expect(marker.y).toBeLessThan(600);
      if (marker.precision === "approximate") expect(marker.radius).toBeGreaterThan(0);
    }
  });

  it("labels example locations as examples", () => {
    for (const discovery of exampleDiscoveries) {
      if (discovery.location) expect(discovery.location).toMatch(/\(example\)$/);
    }
  });

  it("doesn't reuse the eager-loaded hero image lower down the page", () => {
    expect(exampleDiscoveries.some((d) => d.image.src === landingImages.hero.src)).toBe(false);
  });
});

describe("MapPreview", () => {
  it("says it's an illustration, not the game map", () => {
    render(<MapPreview />);
    expect(screen.getByText("Illustrative map · not the game map")).toBeInTheDocument();
  });

  it("filters markers by category", async () => {
    render(<MapPreview />);
    const markers = () => screen.getAllByRole("button", { name: /\(example\)$/ });
    const before = markers().length;
    const filters = screen.getByRole("group", { name: "Filter example markers" });
    await userEvent.click(within(filters).getByRole("button", { name: /Wildlife/ }));
    expect(markers().length).toBeLessThan(before);
    expect(markers().every((m) => /Wildlife/.test(m.getAttribute("aria-label")!))).toBe(true);
  });

  it("opens marker details with precision and a link to the real explorer", async () => {
    render(<MapPreview />);
    await userEvent.click(screen.getByRole("button", { name: /Coupe on the causeway/ }));
    const details = screen.getAllByRole("link", { name: /Open the World Explorer/ })[0].parentElement!;
    expect(within(details).getByText("Approximate coordinate")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open the World Explorer/ })[0]).toHaveAttribute("href", "/world");
  });

  it("lists region-only reports instead of pinning them", () => {
    render(<MapPreview />);
    expect(screen.getByText(/Region only, listed not pinned/)).toBeInTheDocument();
  });

  it("disables zoom out at the starting zoom and enables it after zooming in", async () => {
    render(<MapPreview />);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });
});

describe("LeaderboardPreview", () => {
  const topHandle = () => within(screen.getAllByRole("row")[1]).getByText(/^example_/).textContent;

  it("labels its rankings as examples", () => {
    render(<LeaderboardPreview />);
    expect(screen.getByText("Example rankings")).toBeInTheDocument();
    expect(exampleRankings.every((r) => r.handle.startsWith("example_"))).toBe(true);
  });

  it("re-ranks the same contributors when the measure changes", async () => {
    render(<LeaderboardPreview />);
    expect(topHandle()).toBe("example_neonscout");
    await userEvent.click(screen.getByRole("button", { name: "Reviews" }));
    expect(screen.getByRole("button", { name: "Reviews" })).toHaveAttribute("aria-pressed", "true");
    expect(topHandle()).toBe("example_marshlight");
  });
});
