import { describe, expect, it } from "vitest";
import { GTA_TILE_BOUNDS } from "../gta-map-config";
import { getLocationDetail, getWorldOverview } from "./gtadb.server";
import snapshot from "./gtadb-snapshot.json";

const { regions, markers, bounds } = getWorldOverview();
const within = (x: number, y: number) =>
  x >= GTA_TILE_BOUNDS.minX && x <= GTA_TILE_BOUNDS.maxX && y >= GTA_TILE_BOUNDS.minY && y <= GTA_TILE_BOUNDS.maxY;

describe("GTA VI snapshot (gtadb.org)", () => {
  it("records its source, licence and pinned commit", () => {
    expect(snapshot.source.license).toBe("CC BY 4.0");
    expect(snapshot.source.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("serves every landmark, and every placed one sits on the visible map", () => {
    expect(markers).toHaveLength(snapshot.landmarks.length);
    for (const marker of markers) if (marker.coordinate) expect(within(marker.coordinate.x, marker.coordinate.y)).toBe(true);
    expect(bounds).toEqual(GTA_TILE_BOUNDS);
  });

  it("only uses area names that appear in the data, official destinations first", () => {
    const areaNames = new Set(snapshot.landmarks.map((landmark) => landmark.area.at(-1)));
    for (const region of regions) expect(areaNames.has(region.name)).toBe(true);
    expect(regions[0].name).toBe("Vice City");
    expect(regions.some((region) => region.name === "Leonida")).toBe(false);
  });

  it("never claims Sixth Sense verification, activity or discoveries it doesn't have", () => {
    expect(markers.every((marker) => marker.verification === "awaiting_verification")).toBe(true);
    expect(markers.every((marker) => marker.precision !== "confirmed")).toBe(true);
    const detail = getLocationDetail(markers[0].locationId)!;
    expect(detail.discoveries).toEqual([]);
    expect(detail.activity).toEqual({ discoveries: 0, contributors: 0, lastActivityAt: null });
    expect(detail.source?.license).toBe("CC BY 4.0");
  });

  it("describes a known landmark from its record", () => {
    const vice = getLocationDetail("L1")!;
    expect(vice.name).toBe("Vice Regal");
    expect(vice.areas).toEqual(["Washington Beach", "Vice Beach"]);
    expect(vice.realWorldCounterpart).toMatch(/Ritz-Carlton/);
  });

  it("names every place: the in-game name, or a descriptive one that says so", () => {
    expect(markers.every((marker) => marker.title.trim().length > 0)).toBe(true);
    expect(markers.some((marker) => /unnamed|\?/i.test(marker.title))).toBe(false);
    const unnamed = snapshot.landmarks.find((landmark) => !landmark.name && landmark.tags.includes("residential"))!;
    const detail = getLocationDetail(unnamed.id)!;
    expect(detail.name).toBe(`Residence, ${unnamed.area[0] ?? "Leonida"}`);
    expect(detail.nameKnown).toBe(false);
    expect(getLocationDetail("L1")!.nameKnown).toBe(true);
    const guessed = snapshot.landmarks.find((landmark) => landmark.name?.endsWith("?"))!;
    expect(getLocationDetail(guessed.id)).toMatchObject({ name: guessed.name!.slice(0, -1).trim(), nameKnown: false });
  });

  it("returns null for an unknown id", () => {
    expect(getLocationDetail("nope")).toBeNull();
  });
});
