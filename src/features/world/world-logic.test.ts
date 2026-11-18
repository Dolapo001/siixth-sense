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
import { gtadbTileToMapLibre } from "./gta-projection";
import { defaultLayers, layerForTags } from "./layers";
import { filterByLayers, filterMarkers, markerKind, searchWorld, splitByPlacement } from "./markers";
import { boundsOf, countByArea, neighbourhoodsOf, placesToGeoJSON } from "./places";
import { staticMapSnippet } from "./static-map";
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
  it("maps the game origin to lng/lat 0,0", () => {
    expect(worldToLngLat({ x: 0, y: 0 })).toEqual([0, 0]);
  });

  it("round-trips world → lng/lat → world", () => {
    const point = { x: 1_409.4, y: -2_803.2 };
    const back = lngLatToWorld(worldToLngLat(point));
    expect(back.x).toBeCloseTo(point.x, 4);
    expect(back.y).toBeCloseTo(point.y, 4);
  });

  it("keeps the whole map on a small patch near the equator", () => {
    const [[west, south], [east, north]] = boundsToLngLatBounds({ minX: -16_384, minY: -16_384, maxX: 16_384, maxY: 16_384 });
    expect(east - west).toBeCloseTo(0.3516, 3);
    expect(north - south).toBeCloseTo(0.3516, 3);
  });

  it("puts larger y further north", () => {
    expect(worldToLngLat({ x: 0, y: 4_000 })[1]).toBeGreaterThan(worldToLngLat({ x: 0, y: 1_000 })[1]);
  });

  it("lines tiles up with markers: the game origin sits on the corner of the centre tiles", () => {
    // gtadb zoom 5 is 1 px per metre; tile 64 starts at pixel 16,384 = game x 0.
    const tile = gtadbTileToMapLibre(5, 64, 64);
    expect(tile).toEqual({ z: 17, x: 2 ** 16, y: 2 ** 16 });
    // MapLibre tile x = 2^(z-1) is lng 0; tile y = 2^(z-1) is lat 0.
    expect(worldToLngLat({ x: 0, y: 0 })).toEqual([0, 0]);
  });

  it("centres the coarsest gtadb tiles in MapLibre's grid", () => {
    expect(gtadbTileToMapLibre(0, 0, 0)).toEqual({ z: 12, x: 2_046, y: 2_046 });
    expect(gtadbTileToMapLibre(0, 3, 3)).toEqual({ z: 12, x: 2_049, y: 2_049 });
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

  it("leaves unplaced markers out of the map's places source", () => {
    const ids = placesToGeoJSON(markers).features.map((f) => f.properties.id);
    expect(ids.sort()).toEqual(["a", "b"]);
  });
});

describe("browse hierarchy", () => {
  const place = (id: string, areas: string[], x = 0) =>
    marker({ id, locationId: id, title: id, areas, coordinate: { x, y: 0 } });
  const places = [
    place("a", ["Washington Beach", "Vice Beach"], 0),
    place("b", ["Washington Beach", "Vice Beach"], 100),
    place("c", ["Ocean Beach", "Vice Beach"], 2_000),
    place("d", ["Vice Beach"], 50),
    place("e", ["Belville"], 9_000),
  ];

  it("groups an area's places by the next address level, biggest first, area-only places last", () => {
    expect(neighbourhoodsOf(places, "Vice Beach").map((n) => [n.name, n.markers.length])).toEqual([
      ["Washington Beach", 2],
      ["Ocean Beach", 1],
      ["Elsewhere in Vice Beach", 1],
    ]);
  });

  it("counts places per area", () => {
    expect(countByArea(places).get("Vice Beach")).toBe(4);
  });

  it("frames a group of places, at least a minimum size across", () => {
    expect(boundsOf(places.slice(0, 2))).toEqual({ minX: -250, maxX: 350, minY: -300, maxY: 300 });
    expect(boundsOf([])).toBeNull();
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

describe("layers and search (GTA VI data)", () => {
  const place = (id: string, title: string, layer: WorldMarker["layer"], areas?: string[]) =>
    marker({ id, locationId: id, title, layer, areas, category: "location" });
  const places = [
    place("a", "Vice Regal", "leisure", ["Washington Beach", "Vice Beach"]),
    place("b", "Ocean View Hotel", "leisure", ["Ocean Beach", "Vice Beach"]),
    place("c", "Port Gellhorn Pier", "landmarks", ["Port Gellhorn"]),
    place("d", "Unnamed residential · Belville", "residential", ["Belville"]),
  ];

  it("assigns layers from landmark tags, untagged places to 'other'", () => {
    expect(layerForTags(["hotel", "enterable"])).toBe("leisure");
    expect(layerForTags(["transportation"])).toBe("transport");
    expect(layerForTags(["unconfirmed"])).toBe("other");
  });

  it("starts with a useful subset of layers on, not everything", () => {
    const on = defaultLayers();
    expect(on.has("landmarks")).toBe(true);
    expect(on.has("residential")).toBe(false);
    expect(on.has("other")).toBe(false);
  });

  it("filters by enabled layers", () => {
    expect(filterByLayers(places, new Set(["landmarks"])).map((m) => m.id)).toEqual(["c"]);
  });

  it("finds places by the areas they sit in, after name matches", () => {
    const results = searchWorld("vice", [], places);
    expect(results.map((r) => (r.kind === "marker" ? r.marker.id : r.region.id))).toEqual(["a", "b"]);
  });

  it("ranks names that start with the query first", () => {
    const results = searchWorld("port", [], places);
    expect(results[0]).toMatchObject({ kind: "marker", marker: { id: "c" } });
  });

  it("labels markers by layer when they have one", () => {
    expect(markerKind(places[0]).label).toBe("Hotels & leisure");
    expect(markerKind(marker({})).label).toBe("Vehicle");
  });
});

describe("static map snippets", () => {
  it("covers the requested box with tiles and centres the point", () => {
    const snippet = staticMapSnippet({ x: 1409.4, y: 2803.2 }, { width: 900, aspect: 16 / 9 });
    expect(snippet.point).toEqual({ left: 50, top: 50 });
    // Tiles start at or before the box's top-left and reach past its bottom-right.
    expect(Math.min(...snippet.tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...snippet.tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...snippet.tiles.map((t) => t.left + t.width))).toBeGreaterThanOrEqual(100);
    expect(Math.max(...snippet.tiles.map((t) => t.top + t.height))).toBeGreaterThanOrEqual(100);
  });

  it("uses the same tile grid as the map: the origin tile at zoom 17 is 65536/65536", () => {
    const snippet = staticMapSnippet({ x: 10, y: -10 }, { width: 100, aspect: 1, maxTiles: 4 });
    expect(snippet.tiles.some((t) => t.src.endsWith("/17/65536/65536.jpg"))).toBe(true);
  });
});
