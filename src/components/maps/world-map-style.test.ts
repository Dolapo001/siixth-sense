import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import { GTA_TILE_BOUNDS } from "@/features/world/gta-map-config";
import { worldMapStyle } from "./world-map-style";

describe("world map style", () => {
  const style = worldMapStyle(GTA_TILE_BOUNDS);

  it("is a valid MapLibre style", () => {
    expect(validateStyleMin(style)).toEqual([]);
  });

  it("draws the GTA VI tiles with their licence attribution", () => {
    const source = style.sources.gta;
    expect(source.type).toBe("raster");
    if (source.type !== "raster") return;
    expect(source.tiles?.[0]).toMatch(/\/\{z\}\/\{x\}\/\{y\}\.jpg$/);
    expect(source.attribution).toMatch(/CC BY 4\.0/);
    expect(source.attribution).toMatch(/gtadb\.org/);
  });

  it("masks everything outside Leonida above the tiles", () => {
    const ids = style.layers.map((layer) => layer.id);
    expect(ids.indexOf("outside-leonida")).toBeGreaterThan(ids.indexOf("gta-base"));
  });
});
