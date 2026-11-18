import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { discoveryCategories, type LocationDetail, type Region, type WorldMarker } from "@/features/world/types";
import { CategoryFilter } from "./category-filter";
import { LocationDetails } from "./location-details";
import { LocationList } from "./location-list";
import { MapLegend } from "./map-legend";
import { MapSearch } from "./map-search";

const region: Region = { id: "r1", name: "Sample Region North", bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } };
const marker = (id: string, title: string, overrides: Partial<WorldMarker> = {}): WorldMarker => ({
  id,
  locationId: id,
  title,
  category: "vehicle",
  precision: "confirmed",
  coordinate: { x: 0, y: 0 },
  regionId: "r1",
  verification: "ai_suggested",
  ...overrides,
});

describe("CategoryFilter", () => {
  it("toggles a category off and back on", async () => {
    const onChange = vi.fn();
    const all = new Set(discoveryCategories);
    const { rerender } = render(<CategoryFilter selected={all} onChange={onChange} />);
    const vehicles = screen.getByRole("button", { name: /Vehicles/ });
    expect(vehicles).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(vehicles);
    const next = onChange.mock.calls[0][0] as Set<string>;
    expect(next.has("vehicle")).toBe(false);
    rerender(<CategoryFilter selected={next as never} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /Vehicles/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  });

  it("All re-enables every category", async () => {
    const onChange = vi.fn();
    render(<CategoryFilter selected={new Set(["vehicle"])} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect((onChange.mock.calls[0][0] as Set<string>).size).toBe(discoveryCategories.length);
  });
});

describe("MapSearch", () => {
  const markers = [marker("a", "Sample Location 01"), marker("b", "Sample Location 02")];

  it("selects a result with the keyboard", async () => {
    const onSelect = vi.fn();
    render(<MapSearch regions={[region]} markers={markers} onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "Search locations and regions" });
    await userEvent.type(input, "sample");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith({ kind: "marker", marker: markers[0] });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("says when nothing matches", async () => {
    render(<MapSearch regions={[region]} markers={markers} onSelect={vi.fn()} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByRole("option", { name: "No matches" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Escape closes the results", async () => {
    render(<MapSearch regions={[region]} markers={markers} onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "sample{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});

describe("MapLegend", () => {
  it("is collapsed by default and expands", async () => {
    render(<MapLegend />);
    const toggle = screen.getByRole("button", { name: "Legend" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hidden discoveries")).toBeVisible();
    expect(screen.getByText(/Approximate/)).toBeVisible();
  });
});

describe("LocationList", () => {
  it("lists locations with region and precision, and selects one", async () => {
    const onSelect = vi.fn();
    const items = [marker("a", "Sample Location 01", { precision: "region", coordinate: null })];
    render(<LocationList markers={items} regions={[region]} onSelect={onSelect} emptyMessage="None" />);
    const button = screen.getByRole("button", { name: /Sample Location 01/ });
    expect(within(button).getByText("Sample Region North")).toBeInTheDocument();
    expect(within(button).getByText("Region only")).toBeInTheDocument();
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("shows the empty message", () => {
    render(<LocationList markers={[]} regions={[]} onSelect={vi.fn()} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});

describe("LocationDetails", () => {
  const location: LocationDetail = {
    id: "a",
    name: "Sample Location 01",
    regionId: "r1",
    description: "Sample description.",
    precision: "approximate",
    coordinate: { x: 1204, y: 3880 },
    radius: 250,
    verification: "disputed",
    discoveries: [
      {
        id: "d1",
        title: "Sample discovery 1",
        category: "vehicle",
        verification: "verified",
        submittedAt: "2026-11-02T12:00:00Z",
      },
    ],
    relatedEntities: [],
    activity: { discoveries: 1, contributors: 2, lastActivityAt: "2026-11-02T12:00:00Z" },
    screenshots: [],
  };

  it("shows trust, precision, coordinate and uncertainty", () => {
    render(<LocationDetails location={location} region={region} />);
    expect(screen.getByText("Disputed")).toBeInTheDocument();
    expect(screen.getByText("Approximate coordinate")).toBeInTheDocument();
    expect(screen.getByText("X 1,204 · Y 3,880 · ±250 units")).toBeInTheDocument();
    expect(screen.getByText("Sample Region North")).toBeInTheDocument();
  });

  it("links discoveries and handles missing screenshots", () => {
    render(<LocationDetails location={location} region={region} />);
    expect(screen.getByRole("link", { name: /Sample discovery 1/ })).toHaveAttribute("href", "/discoveries/d1");
    expect(screen.getByText("No screenshots yet")).toBeInTheDocument();
  });

  it("says when there is no coordinate", () => {
    render(
      <LocationDetails
        location={{ ...location, precision: "unknown", coordinate: null, regionId: null }}
        region={null}
      />,
    );
    expect(screen.getByText("No coordinate")).toBeInTheDocument();
    expect(screen.getByText("Region unknown")).toBeInTheDocument();
  });
});
