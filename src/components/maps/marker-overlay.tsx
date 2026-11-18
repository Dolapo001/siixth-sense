"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { categoryConfig } from "@/features/world/categories";
import { worldToLngLat } from "@/features/world/coordinates";
import type { createMarkerIndex, MapItem } from "@/features/world/markers";
import type { WorldBounds, WorldMarker } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

const precisionLabel = {
  confirmed: "confirmed coordinate",
  approximate: "approximate coordinate",
  region: "region only",
  unknown: "location unknown",
} as const;

type MarkerIndex = ReturnType<typeof createMarkerIndex>;

type View = { bbox: [number, number, number, number]; zoom: number; version: number };

function readView(map: MapLibreMap, version: number): View {
  const b = map.getBounds();
  // Pad the box so markers just off-screen are ready when panning.
  const padX = (b.getEast() - b.getWest()) * 0.1;
  const padY = (b.getNorth() - b.getSouth()) * 0.1;
  return {
    bbox: [b.getWest() - padX, b.getSouth() - padY, b.getEast() + padX, b.getNorth() + padY],
    zoom: map.getZoom(),
    version,
  };
}

/** Re-reads the camera on every move, at most once per animation frame. */
function useMapView(map: MapLibreMap) {
  const [view, setView] = useState(() => readView(map, 0));

  useEffect(() => {
    let frame = 0;
    let version = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setView(readView(map, ++version)));
    };
    map.on("move", update);
    map.on("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      map.off("move", update);
      map.off("resize", update);
    };
  }, [map]);

  return view;
}

type MarkerOverlayProps = {
  map: MapLibreMap;
  index: MarkerIndex;
  world: WorldBounds;
  selectedId: string | null;
  onSelect: (marker: WorldMarker) => void;
};

/**
 * Markers and clusters as real buttons over the map, so they're reachable by
 * keyboard and announced by screen readers.
 */
export function MarkerOverlay({ map, index, world, selectedId, onSelect }: MarkerOverlayProps) {
  const view = useMapView(map);
  const items = index.getItems(view.bbox, view.zoom);

  const onCluster = (item: Extract<MapItem, { type: "cluster" }>) => {
    map.easeTo({ center: item.lngLat, zoom: Math.min(index.getExpansionZoom(item.id), map.getMaxZoom()) });
  };

  const { clientWidth: width, clientHeight: height } = map.getContainer();

  return (
    // overflow-clip, not hidden: a hidden overflow box can be scrolled by focus, dragging every marker off its spot.
    <div className="pointer-events-none absolute inset-0 overflow-clip" aria-label="Map markers" role="group">
      {items.map((item) => {
        const point = map.project(item.lngLat);
        const style = { transform: `translate(${point.x}px, ${point.y}px)` };
        // Items in the pre-loaded margin outside the visible map stay out of the tab order and the a11y tree.
        const offscreen = point.x < 0 || point.y < 0 || point.x > width || point.y > height;
        const hiddenProps = offscreen ? { tabIndex: -1, "aria-hidden": true } : {};

        if (item.type === "cluster") {
          return (
            <button
              key={`c${item.id}`}
              type="button"
              onClick={() => onCluster(item)}
              aria-label={`${item.count} discoveries here. Zoom in`}
              style={style}
              {...hiddenProps}
              className="pointer-events-auto absolute top-0 left-0 -mt-5 -ml-5 flex size-10 items-center justify-center rounded-full border border-accent/50 bg-surface/90 text-meta font-semibold text-fg shadow-[0_0_0_4px_rgb(85_214_208/0.08)] transition-colors hover:border-accent hover:bg-surface-elevated"
            >
              {item.count}
            </button>
          );
        }

        const { marker } = item;
        const selected = marker.id === selectedId;
        const Icon = categoryConfig[marker.category].icon;
        const approximate = marker.precision === "approximate";
        const radiusPx =
          approximate && marker.radius && marker.coordinate
            ? Math.abs(
                map.project(worldToLngLat({ x: marker.coordinate.x + marker.radius, y: marker.coordinate.y })).x -
                  point.x,
              )
            : 0;

        return (
          <div key={marker.id} style={style} className="absolute top-0 left-0">
            {radiusPx > 18 && (
              <span
                aria-hidden
                className={cn(
                  "absolute rounded-full border border-dashed",
                  selected ? "border-accent/70 bg-accent/5" : "border-muted/40",
                )}
                style={{ width: radiusPx * 2, height: radiusPx * 2, left: -radiusPx, top: -radiusPx }}
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(marker)}
              aria-pressed={selected}
              aria-label={`${marker.title}, ${categoryConfig[marker.category].label}, ${precisionLabel[marker.precision]}`}
              {...hiddenProps}
              className={cn(
                // before: widens the hit area to 44px without changing the drawn marker.
                "pointer-events-auto absolute -top-4 -left-4 flex size-8 items-center before:absolute before:-inset-1.5 before:content-[''] justify-center rounded-full border transition-[transform,background-color,border-color] duration-150",
                approximate && "border-dashed",
                selected
                  ? "z-10 scale-125 border-accent bg-accent text-midnight"
                  : marker.category === "hidden"
                    ? "border-signal/70 bg-surface-elevated text-signal hover:scale-110"
                    : "border-border bg-surface-elevated text-fg hover:scale-110 hover:border-accent",
              )}
            >
              <Icon aria-hidden className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
