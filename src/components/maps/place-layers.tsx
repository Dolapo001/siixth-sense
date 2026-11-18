"use client";

import { createElement, useEffect, useEffectEvent, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Popup, type GeoJSONSource, type Map as MapLibreMap, type MapLayerMouseEvent, type MapMouseEvent } from "maplibre-gl";
import { brandColors } from "@/components/brand/colors";
import { worldLayers } from "@/features/world/layers";
import { placesToGeoJSON, type PlaceProps } from "@/features/world/places";
import type { WorldMarker } from "@/features/world/types";

/*
 * Places drawn by MapLibre itself: a clustered GeoJSON source with circle and
 * icon layers, so thousands of places cost the GPU, not React. Layer icons are
 * the lucide icons used elsewhere, rendered once into map images; cluster
 * counts are drawn into images on demand, so no font server is needed.
 * Keyboard and screen-reader users reach the same places through search and
 * the Browse panel (canvas features can't take focus).
 */

const SOURCE = "places";
const L = {
  clusters: "place-clusters",
  clusterCounts: "place-cluster-counts",
  points: "place-points",
  icons: "place-icons",
  selected: "place-selected",
  namedLabels: "place-labels-named",
  otherLabels: "place-labels-descriptive",
} as const;

const ICON_PX = 14;
/** Half the side of the tap hit box, in px. */
const TAP_SLOP = 12;
const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

async function addLayerIcons(map: MapLibreMap) {
  const ratio = Math.min(3, Math.ceil(window.devicePixelRatio || 1));
  await Promise.all(
    worldLayers.map(async ({ id, icon }) => {
      const name = `layer-${id}`;
      if (map.hasImage(name)) return;
      const svg = renderToStaticMarkup(
        createElement(icon, { size: ICON_PX * ratio, color: brandColors.fg, strokeWidth: 2 }),
      );
      const image = new Image(ICON_PX * ratio, ICON_PX * ratio);
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
      if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: ratio });
    }),
  );
}

/** Draws "count-<n>" images the first time a cluster needs one. */
function drawCountImage(map: MapLibreMap, name: string) {
  const text = name.slice("count-".length);
  const ratio = Math.min(3, Math.ceil(window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = 40 * ratio;
  canvas.height = 20 * ratio;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  context.fillStyle = brandColors.fg;
  context.font = `600 11px ${getComputedStyle(document.body).fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 20, 10.5);
  map.addImage(name, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: ratio });
}

/** Draws a "label-<id>" image: the place's name on a dark pill. Known names bright, descriptive ones muted. */
function drawLabelImage(map: MapLibreMap, name: string, place: { title: string; named: boolean } | undefined) {
  if (!place) return;
  const ratio = Math.min(3, Math.ceil(window.devicePixelRatio || 1));
  const text = place.title.length > 34 ? `${place.title.slice(0, 33)}…` : place.title;
  const font = `${place.named ? 600 : 500} 11px ${getComputedStyle(document.body).fontFamily}`;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + 12;
  const height = 18;
  const canvas = document.createElement("canvas");
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  context.fillStyle = "rgba(11, 16, 24, 0.86)";
  context.beginPath();
  context.roundRect(0, 0, width, height, 4);
  context.fill();
  context.font = font;
  context.fillStyle = place.named ? brandColors.fg : brandColors.muted;
  context.textBaseline = "middle";
  context.fillText(text, 6, height / 2 + 0.5);
  map.addImage(name, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: ratio });
}

type PlaceLayersProps = {
  map: MapLibreMap;
  /** Placed markers on the enabled layers. */
  markers: WorldMarker[];
  selectedId: string | null;
  onSelect: (markerId: string) => void;
};

export default function PlaceLayers({ map, markers, selectedId, onSelect }: PlaceLayersProps) {
  const [ready, setReady] = useState(false);
  const handleSelect = useEffectEvent(onSelect);
  // Names for on-demand label images, looked up when MapLibre asks for one.
  const placeById = useEffectEvent((id: string) => markers.find((marker) => marker.id === id));

  // Source, layers and interactions, once per map.
  useEffect(() => {
    let cancelled = false;
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "ss-map-label" });

    // MapLibre can ask for the same image more than once in a batch, and a throw here
    // (adding a name twice) drops every other image in that batch. Guard and contain it.
    const onMissingImage = ({ id }: { id: string }) => {
      if (map.hasImage(id)) return;
      try {
        if (id.startsWith("count-")) drawCountImage(map, id);
        else if (id.startsWith("label-")) {
          const place = placeById(id.slice("label-".length));
          drawLabelImage(map, id, place && { title: place.title, named: place.nameKnown !== false });
        }
      } catch (error) {
        console.warn("World map: couldn't draw", id, error);
      }
    };
    // One handler for taps and clicks with a forgiving hit box: dots are small, fingers aren't.
    // Picks the place or group nearest the tap within 12 px.
    const onMapClick = async (event: MapMouseEvent) => {
      if (!map.getLayer(L.points)) return;
      const { x, y } = event.point;
      const hits = map.queryRenderedFeatures(
        [
          [x - TAP_SLOP, y - TAP_SLOP],
          [x + TAP_SLOP, y + TAP_SLOP],
        ],
        { layers: [L.points, L.clusters] },
      );
      const nearest = hits
        .filter((feature) => feature.geometry.type === "Point")
        .map((feature) => {
          const point = map.project(feature.geometry.type === "Point" ? (feature.geometry.coordinates as [number, number]) : [0, 0]);
          return { feature, distance: Math.hypot(point.x - x, point.y - y) };
        })
        .sort((a, b) => a.distance - b.distance)[0]?.feature;
      if (!nearest || nearest.geometry.type !== "Point") return;
      if (nearest.layer.id === L.clusters) {
        const zoom = await (map.getSource(SOURCE) as GeoJSONSource).getClusterExpansionZoom(
          nearest.properties.cluster_id as number,
        );
        map.easeTo({ center: nearest.geometry.coordinates as [number, number], zoom });
      } else {
        handleSelect((nearest.properties as PlaceProps).id);
      }
    };
    const onEnter = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (feature?.layer.id === L.points && feature.geometry.type === "Point") {
        popup
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setText((feature.properties as PlaceProps).title)
          .addTo(map);
      }
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    (async () => {
      await addLayerIcons(map);
      if (cancelled) return;
      map.on("styleimagemissing", onMissingImage);
      map.addSource(SOURCE, { type: "geojson", data: empty, cluster: true, clusterRadius: 44, clusterMaxZoom: 15 });
      map.addLayer({
        id: L.clusters,
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": brandColors.surface,
          "circle-opacity": 0.92,
          "circle-stroke-color": brandColors.accent,
          "circle-stroke-opacity": 0.6,
          "circle-stroke-width": 1.5,
          "circle-radius": ["step", ["get", "point_count"], 15, 25, 19, 100, 24],
        },
      });
      map.addLayer({
        id: L.clusterCounts,
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "icon-image": ["concat", "count-", ["get", "point_count_abbreviated"]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      map.addLayer({
        id: L.points,
        type: "circle",
        source: SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": brandColors["surface-elevated"],
          "circle-stroke-color": [
            "match",
            ["get", "layer"],
            "landmarks",
            brandColors.accent,
            brandColors["border-strong"],
          ],
          "circle-stroke-width": 1.5,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 4, 14, 10, 17, 12],
        },
      });
      map.addLayer({
        id: L.icons,
        type: "symbol",
        source: SOURCE,
        minzoom: 13.5,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["concat", "layer-", ["get", "layer"]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      // Names under the markers. Overlapping labels are hidden by MapLibre's collision
      // detection, known names win over descriptive ones, and descriptive names wait
      // for a closer zoom so the map doesn't turn into text.
      const labelLayout = (sortKey: number) => ({
        "icon-image": ["concat", "label-", ["get", "id"]] as ["concat", string, ["get", string]],
        "icon-anchor": "top" as const,
        "icon-offset": [0, 14] as [number, number],
        "icon-padding": 2,
        "symbol-sort-key": sortKey,
      });
      map.addLayer({
        id: L.namedLabels,
        type: "symbol",
        source: SOURCE,
        minzoom: 14,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "named"], true]],
        layout: labelLayout(0),
      });
      map.addLayer({
        id: L.otherLabels,
        type: "symbol",
        source: SOURCE,
        minzoom: 16,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "named"], false]],
        layout: labelLayout(1),
      });
      map.addLayer({
        id: L.selected,
        type: "circle",
        source: SOURCE,
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": brandColors.accent,
          "circle-opacity": 0.18,
          "circle-stroke-color": brandColors.accent,
          "circle-stroke-width": 2.5,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 9, 14, 15, 17, 17],
        },
      });
      map.on("click", onMapClick);
      for (const layer of [L.points, L.clusters]) {
        map.on("mouseenter", layer, onEnter);
        map.on("mouseleave", layer, onLeave);
      }
      setReady(true);
    })().catch((error) => console.warn("World map: couldn't add places", error));

    return () => {
      cancelled = true;
      popup.remove();
      map.off("styleimagemissing", onMissingImage);
      map.off("click", onMapClick);
      for (const layer of [L.points, L.clusters]) {
        map.off("mouseenter", layer, onEnter);
        map.off("mouseleave", layer, onLeave);
      }
      // The map may already be removed (its own cleanup runs first on unmount).
      if (map.getStyle()) {
        for (const id of Object.values(L)) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      }
      setReady(false);
    };
  }, [map]);

  useEffect(() => {
    if (ready) (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(placesToGeoJSON(markers));
  }, [map, ready, markers]);

  useEffect(() => {
    if (ready) map.setFilter(L.selected, ["==", ["get", "id"], selectedId ?? ""]);
  }, [map, ready, selectedId]);

  return null;
}
