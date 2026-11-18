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
} from "@/features/landing/fixtures";
import { LeaderboardPreview } from "./leaderboard-preview";
import { getPreviewPlaces, getPreviewTiles, PREVIEW_ASPECT } from "@/features/landing/leonida-preview.server";
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

  it("labels example locations as examples", () => {
    for (const discovery of exampleDiscoveries) {
      if (discovery.location) expect(discovery.location).toMatch(/\(example\)$/);
    }
  });

  it("doesn't reuse the eager-loaded hero image lower down the page", () => {
    expect(exampleDiscoveries.some((d) => d.image.src === landingImages.hero.src)).toBe(false);
  });
});

describe("MapPreview (real GTA VI data)", () => {
  const places = getPreviewPlaces();
  const tiles = getPreviewTiles();
  const preview = () => render(<MapPreview places={places} tiles={tiles} aspect={PREVIEW_ASPECT} />);

  it("features real, named landmarks placed on the map", () => {
    expect(places.length).toBeGreaterThanOrEqual(10);
    for (const place of places) {
      expect(place.title).not.toMatch(/unnamed|\?/i);
      expect(place.left).toBeGreaterThanOrEqual(0);
      expect(place.left).toBeLessThanOrEqual(100);
      expect(place.top).toBeGreaterThanOrEqual(0);
      expect(place.top).toBeLessThanOrEqual(100);
    }
  });

  it("lays real map tiles under the whole preview", () => {
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((tile) => /\/13\/\d+\/\d+\.jpg$/.test(tile.src))).toBe(true);
  });

  it("credits the community map and says it's unofficial", () => {
    preview();
    expect(screen.getByText(/Community layer/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "gtadb.org" })).toHaveAttribute("href", "https://map.gtadb.org");
  });

  it("shows a place's details from the data, with a link into the World Explorer", async () => {
    preview();
    await userEvent.click(screen.getByRole("button", { name: /^Vice Regal,/ }));
    const card = screen.getByRole("heading", { name: "Vice Regal" }).closest("article")!;
    expect(within(card).getByText(/Ritz-Carlton/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Open in the World Explorer/ })).toHaveAttribute("href", "/world/L1");
  });

  it("filters places by layer", async () => {
    preview();
    const before = within(screen.getByRole("list", { name: "Featured places" })).getAllByRole("button").length;
    await userEvent.click(within(screen.getByRole("group", { name: "Show places by layer" })).getByRole("button", { name: "Nature" }));
    const after = within(screen.getByRole("list", { name: "Featured places" })).getAllByRole("button");
    expect(after.length).toBeLessThan(before);
    expect(after.every((b) => /Nature$/.test(b.getAttribute("aria-label")!))).toBe(true);
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
