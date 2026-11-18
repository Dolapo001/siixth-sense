"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useRef } from "react";
import { getVersion, Map as MapLibreMap, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { brandColors } from "@/components/brand/colors";
import { boundsToLngLatBounds, gridLines, padBounds, WORLD_FIT_PADDING } from "@/features/world/coordinates";
import { GTA_MAP_ATTRIBUTION, GTA_MAP_TILES_URL, GTA_TILE_BOUNDS, GTA_TILE_ZOOM } from "@/features/world/gta-map-config";
import type { WorldBounds } from "@/features/world/types";

// MapLibre resolves its worker relative to its own bundle, which Next renames.
// Serve the copy made by scripts/copy-maplibre-worker.mjs instead.
setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);


/** Grid spacing in world units for the placeholder base layer. */
const GRID_STEP = 500;

function placeholderStyle(world: WorldBounds): StyleSpecification {
  const [[west, south], [east, north]] = boundsToLngLatBounds(world);
  return {
    version: 8,
    sources: {
      // GTA VI community map tiles (gtadb.org, CC BY 4.0), self-hosted. See gta-map-config.ts.
      gta: {
        type: "raster",
        tiles: [`${GTA_MAP_TILES_URL}/{z}/{x}/{y}.jpg`],
        tileSize: 256,
        minzoom: GTA_TILE_ZOOM.min,
        maxzoom: GTA_TILE_ZOOM.max,
        bounds: [...boundsToLngLatBounds(GTA_TILE_BOUNDS)].flat() as [number, number, number, number],
        attribution: GTA_MAP_ATTRIBUTION,
      },
      grid: { type: "geojson", data: gridLines(world, GRID_STEP) },
      edge: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          },
        },
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": brandColors.midnight } },
      {
        id: "gta-base",
        type: "raster",
        source: "gta",
        // Toned down to sit in the dark interface without losing the map's colour.
        paint: { "raster-brightness-max": 0.82, "raster-saturation": -0.15, "raster-fade-duration": 150 },
      },
      {
        id: "grid-minor",
        type: "line",
        source: "grid",
        filter: ["!", ["get", "major"]],
        paint: { "line-color": brandColors.border, "line-width": 0.5, "line-opacity": 0.18 },
      },
      {
        id: "grid-major",
        type: "line",
        source: "grid",
        filter: ["get", "major"],
        paint: { "line-color": brandColors.border, "line-width": 1, "line-opacity": 0.35 },
      },
      {
        id: "world-edge",
        type: "line",
        source: "edge",
        paint: { "line-color": brandColors.muted, "line-width": 1, "line-opacity": 0.5, "line-dasharray": [4, 4] },
      },
    ],
  };
}

type WorldMapProps = {
  world: WorldBounds;
  onReady: (map: MapLibreMap | null) => void;
  /** Called when the map can't start, e.g. no WebGL2 support. */
  onError: (error: unknown) => void;
  className?: string;
};

/**
 * MapLibre base map. Draws only the placeholder background and coordinate
 * grid; markers are rendered as an accessible React overlay on top.
 * When a permitted map asset exists, add it as a raster/vector source here.
 */
export function WorldMap({ world, onReady, onError, className }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleReady = useEffectEvent(onReady);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: placeholderStyle(world),
        bounds: boundsToLngLatBounds(world),
        fitBoundsOptions: { padding: WORLD_FIT_PADDING },
        // MapLibre zooms in until maxBounds covers the viewport, so the margin must
        // be wide enough for wide screens or it crops the fitted world.
        maxBounds: boundsToLngLatBounds(padBounds(world, 1)),
        maxZoom: GTA_TILE_ZOOM.max + 2,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
      });
    } catch (error) {
      handleError(error);
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.getCanvas().setAttribute("aria-label", "World map. Use arrow keys to pan and plus or minus to zoom.");

    // Errors before the first load (e.g. the worker file is missing) mean the map can't
    // render: hand over to the list fallback. Later errors (a failed tile) are not fatal.
    let loaded = false;
    map.on("error", (event) => {
      if (loaded) console.warn("World map:", event.error?.message);
      else handleError(event.error ?? new Error("The map failed to load."));
    });
    map.getCanvas().addEventListener("webglcontextlost", () => handleError(new Error("The map's graphics context was lost.")));

    map.once("load", () => {
      loaded = true;
      // Allow a little zoom-out past the fitted view, but not to a speck.
      map.setMinZoom(Math.max(0, map.getZoom() - 1));
      handleReady(map);
    });

    return () => {
      handleReady(null);
      map.remove();
    };
  }, [world]);

  // MapLibre's unlayered CSS sets `position: relative` on its container, which
  // beats Tailwind's layered utilities. Position a wrapper instead and let the
  // map container simply fill it.
  return (
    <div className={className}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
