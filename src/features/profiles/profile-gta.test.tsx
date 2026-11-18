import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorldOverview } from "@/features/world/data/gtadb.server";
import { CategoryBreakdown, TheirLeonida } from "./profile-gta";

// Area pins are placed from the real GTA VI snapshot's areas, without HTTP.
vi.mock("@/features/world/data/source", () => ({
  getWorldDataSource: async () => {
    const overview = getWorldOverview();
    return {
      kind: "snapshot",
      getWorldBounds: async () => overview.bounds,
      listRegions: async () => overview.regions,
      listMarkers: async () => overview.markers,
      getLocation: async () => null,
    };
  },
}));

const withQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("TheirLeonida", () => {
  const areas = [
    { name: "Vice Beach", discoveries: 5, verified: 2 },
    { name: "Port Gellhorn", discoveries: 1, verified: 0 },
  ];

  it("pins each area on the Leonida map and lists them with counts", async () => {
    withQuery(<TheirLeonida areas={areas} displayName="Someone" />);
    const pins = await screen.findByRole("list", { name: "Areas where Someone made discoveries" });
    expect(await within(pins).findByText(/Vice Beach/)).toBeInTheDocument();
    expect(within(pins).getByText(/Port Gellhorn/)).toBeInTheDocument();
    expect(screen.getByText("2 verified")).toBeInTheDocument();
    expect(screen.getByText("Areas explored · 2")).toBeInTheDocument();
  });

  it("says so when nothing has been placed yet", () => {
    withQuery(<TheirLeonida areas={[]} displayName="Someone" />);
    expect(screen.getByText(/No discoveries placed in Leonida yet/)).toBeInTheDocument();
  });
});

describe("CategoryBreakdown", () => {
  it("lists categories with discoveries, biggest first, linking to the filtered feed", () => {
    render(
      <CategoryBreakdown
        username="someone"
        byCategory={{ wildlife: { submitted: 1, verified: 0 }, vehicle: { submitted: 4, verified: 3 } }}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Vehicles"),
      expect.stringContaining("Wildlife"),
    ]);
    expect(links[0]).toHaveAttribute("href", "/discoveries?by=someone&category=vehicle");
    expect(screen.getByText(/3 verified/)).toBeInTheDocument();
  });
});
