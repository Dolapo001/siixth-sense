"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useRef } from "react";
import { getVersion, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { worldMapStyle } from "./world-map-style";
import { boundsToLngLatBounds, padBounds, WORLD_FIT_PADDING } from "@/features/world/coordinates";
import { GTA_TILE_ZOOM } from "@/features/world/gta-map-config";
import type { WorldBounds } from "@/features/world/types";

// MapLibre resolves its worker relative to its own bundle, which Next renames.
// Serve the copy made by scripts/copy-maplibre-worker.mjs instead.
setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);


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
        style: worldMapStyle(world),
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
    // A tile or source that fails to load (e.g. open sea with no tile) is never fatal: the map
    // just shows the background there. Only errors before the first load that aren't tied to a
    // source (the worker or style can't load) mean the map can't render.
    map.on("error", (event) => {
      const fromSource = "sourceId" in event || "tile" in event;
      if (loaded || fromSource) console.warn("World map:", event.error?.message);
      else handleError(event.error ?? new Error("The map failed to load."));
    });
    // MapLibre releases its own context in map.remove() (every unmount, and every remount in
    // development), and restores it after a GPU reset on its own. Losing it is never fatal here.
    const canvas = map.getCanvas();
    const onContextLost = () => console.warn("World map: graphics context lost; MapLibre will restore it.");
    canvas.addEventListener("webglcontextlost", onContextLost);

    map.once("load", () => {
      loaded = true;
      // Allow a little zoom-out past the fitted view, but not to a speck.
      map.setMinZoom(Math.max(0, map.getZoom() - 1));
      handleReady(map);
    });

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
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
