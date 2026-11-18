import { describe, expect, it } from "vitest";
import {
  boundsToLngLatBounds,
  formatCoordinate,
  gridLines,
  lngLatToWorld,
  padBounds,
  worldToLngLat,
} from "./coordinates";
import { createMockWorldSource } from "./data/mock-source";
import { createMarkerIndex, filterMarkers, searchWorld, splitByPlacement } from "./markers";
import { discoveryCategories, type Region, type WorldBounds, type WorldMarker } from "./types";
import { locationHref, selectedLocationFromPath } from "./routing";

const world: WorldBounds = { minX: 0, minY: 0, maxX: 10_000, maxY: 5_000 };

const marker = (overrides: Partial<WorldMarker>): WorldMarker => ({
  id: "m",
  locationId: "m",
  title: "Marker",
  category: "vehicle",
  precision: "confirmed",
  coordinate: { x: 1_000, y: 1_000 },
  regionId: null,
  verification: "ai_suggested",
  ...overrides,
});

describe("coordinates", () => {
  it("maps the world centre to lng/lat 0,0", () => {
    expect(worldToLngLat({ x: 5_000, y: 2_500 }, world)).toEqual([0, 0]);
  });

  it("round-trips world → lng/lat → world", () => {
    const point = { x: 1_234, y: 4_321 };
    const back = lngLatToWorld(worldToLngLat(point, world), world);
    expect(back.x).toBeCloseTo(point.x, 6);
    expect(back.y).toBeCloseTo(point.y, 6);
  });

  it("keeps aspect ratio and stays within a small span", () => {
    const [[west, south], [east, north]] = boundsToLngLatBounds(world, world);
    expect(east - west).toBeCloseTo(0.5);
    expect(north - south).toBeCloseTo(0.25);
  });

  it("puts larger y further north", () => {
    expect(worldToLngLat({ x: 0, y: 4_000 }, world)[1]).toBeGreaterThan(worldToLngLat({ x: 0, y: 1_000 }, world)[1]);
  });

  it("pads bounds on every side", () => {
    expect(padBounds(world, 0.1)).toEqual({ minX: -1_000, minY: -500, maxX: 11_000, maxY: 5_500 });
  });

  it("formats coordinates for display", () => {
    expect(formatCoordinate({ x: 1204.4, y: 3880.6 })).toBe("X 1,204 · Y 3,881");
  });

  it("builds grid lines across the world", () => {
    const grid = gridLines(world, 1_000);
    // 11 vertical (0..10000) + 6 horizontal (0..5000)
    expect(grid.features).toHaveLength(17);
    // Major every 5 steps: x = 0, 5000, 10000 and y = 0, 5000
    expect(grid.features.filter((f) => f.properties.major)).toHaveLength(5);
  });
});

describe("markers", () => {
  const markers = [
    marker({ id: "a", title: "Alpha Garage", category: "vehicle" }),
    marker({ id: "b", title: "Beta Tower", category: "location" }),
    marker({ id: "c", title: "Gamma Ridge", category: "wildlife", precision: "region", coordinate: null }),
    marker({ id: "d", title: "Delta", category: "hidden", precision: "unknown", coordinate: null }),
  ];
  const regions: Region[] = [{ id: "r1", name: "Alpha Region", bounds: world }];

  it("filters by enabled categories", () => {
    expect(filterMarkers(markers, new Set(["vehicle", "hidden"])).map((m) => m.id)).toEqual(["a", "d"]);
  });

  it("never pins items without a coordinate", () => {
    const { placed, unplaced } = splitByPlacement(markers);
    expect(placed.map((m) => m.id)).toEqual(["a", "b"]);
    expect(unplaced.map((m) => m.id)).toEqual(["c", "d"]);
  });

  it("searches regions first, case-insensitively", () => {
    const results = searchWorld("ALPHA", regions, markers);
    expect(results.map((r) => r.kind)).toEqual(["region", "marker"]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchWorld("   ", regions, markers)).toEqual([]);
  });

  it("clusters nearby markers when zoomed out and splits them when zoomed in", () => {
    const close = [
      marker({ id: "x", coordinate: { x: 5_000, y: 2_500 } }),
      marker({ id: "y", coordinate: { x: 5_010, y: 2_505 } }),
    ];
    const index = createMarkerIndex(close, world);
    const everywhere: [number, number, number, number] = [-1, -1, 1, 1];
    const zoomedOut = index.getItems(everywhere, 8);
    expect(zoomedOut).toHaveLength(1);
    expect(zoomedOut[0]).toMatchObject({ type: "cluster", count: 2 });
    const zoomedIn = index.getItems(everywhere, 16);
    expect(zoomedIn.map((item) => item.type)).toEqual(["marker", "marker"]);
  });

  it("leaves unplaced markers out of the spatial index", () => {
    const index = createMarkerIndex(markers, world);
    const ids = index.getItems([-1, -1, 1, 1], 16).flatMap((item) => (item.type === "marker" ? [item.marker.id] : []));
    expect(ids.sort()).toEqual(["a", "b"]);
  });
});

describe("selectedLocationFromPath", () => {
  it.each([
    ["/world", null],
    ["/world/sample-03", "sample-03"],
    ["/world/a%20b", "a b"],
    ["/worldwide", null],
    [null, null],
  ] as const)("%s → %s", (path, expected) => {
    expect(selectedLocationFromPath(path)).toBe(expected);
  });
});

describe("locationHref", () => {
  it("encodes ids safely", () => {
    expect(locationHref("a b/c")).toBe("/world/a%20b%2Fc");
  });
});

describe("mock world source", () => {
  it("is labelled as sample data", () => {
    expect(createMockWorldSource().kind).toBe("sample");
  });

  it("uses only generic sample names", async () => {
    const source = createMockWorldSource();
    const [markers, regions] = await Promise.all([source.listMarkers(), source.listRegions()]);
    expect(markers.every((m) => m.title.startsWith("Sample "))).toBe(true);
    expect(regions.every((r) => r.name.startsWith("Sample "))).toBe(true);
  });

  it("only gives coordinates to confirmed and approximate items", async () => {
    const markers = await createMockWorldSource().listMarkers();
    for (const m of markers) {
      expect(m.coordinate !== null).toBe(m.precision === "confirmed" || m.precision === "approximate");
    }
    expect(new Set(markers.map((m) => m.precision))).toEqual(
      new Set(["confirmed", "approximate", "region", "unknown"]),
    );
  });

  it("covers every category and is stable across calls", async () => {
    const a = await createMockWorldSource().listMarkers();
    const b = await createMockWorldSource().listMarkers();
    expect(a).toEqual(b);
    expect(new Set(a.map((m) => m.category))).toEqual(new Set(discoveryCategories));
  });

  it("returns null for unknown locations", async () => {
    expect(await createMockWorldSource().getLocation("does-not-exist")).toBeNull();
  });
});
