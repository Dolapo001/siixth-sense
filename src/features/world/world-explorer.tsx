"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ChevronDown, Info, Layers, ListTree, Map as MapIcon, MonitorX } from "lucide-react";
import { LayerFilter } from "@/components/maps/layer-filter";
import { LocationDetails } from "@/components/maps/location-details";
import { LocationList } from "@/components/maps/location-list";
import { MapControls } from "@/components/maps/map-controls";
import { LegendContent, MapLegend } from "@/components/maps/map-legend";
import { MapSearch } from "@/components/maps/map-search";
import { AreaBrowser, type BrowsePath } from "@/components/maps/area-browser";
import { WorldPanel } from "@/components/maps/world-panel";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utilities/cn";
import { boundsToLngLatBounds, WORLD_FIT_PADDING, worldToLngLat } from "./coordinates";
import { GTA_TILE_ZOOM } from "./gta-map-config";
import { useLocation, useWorldOverview } from "./hooks";
import { defaultLayers, type WorldLayerId } from "./layers";
import { filterByLayers, splitByPlacement, type SearchResult } from "./markers";
import { boundsOf } from "./places";
import { type Region, type WorldBounds, type WorldMarker } from "./types";
import { locationHref, selectedLocationFromPath } from "./routing";
import { WorldPlaceholder } from "./world-placeholder";

// MapLibre (~1 MB) loads on the client only, in parallel with the world data, instead of
// blocking the explorer's first render. The grid backdrop shows meanwhile.
const WorldMap = dynamic(() => import("@/components/maps/world-map").then((m) => m.WorldMap), { ssr: false });
// Places drawn natively by MapLibre; loads with the map.
const PlaceLayers = dynamic(() => import("@/components/maps/place-layers"), { ssr: false });

/** GTA VI's six official destinations. The area menu lists the ones the data has first. */
const DESTINATION_NAMES = new Set([
  "Vice City",
  "Leonida Keys",
  "Grassrivers",
  "Port Gellhorn",
  "Ambrosia",
  "Mount Kalaga National Park",
]);

const sectionClass = "relative h-[calc(100dvh-7.5rem)] overflow-hidden md:h-dvh";

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"
    />
  );
}

export function WorldExplorerLoading() {
  return (
    <section className={sectionClass} aria-busy>
      <GridBackdrop />
      <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3 md:p-4">
        <Skeleton className="h-10 w-full md:max-w-xl" />
        <Skeleton className="h-8 w-2/3 md:max-w-lg" />
      </div>
      <div className="relative flex h-full items-center justify-center">
        <div role="status" className="text-small text-muted">
          Loading world map…
        </div>
      </div>
    </section>
  );
}

export function WorldExplorer() {
  const pathname = usePathname();
  const selectedId = selectedLocationFromPath(pathname);
  const overview = useWorldOverview();

  if (overview.unavailable) return <WorldPlaceholder />;
  if (overview.isError) {
    return (
      <section className={cn(sectionClass, "flex items-center justify-center")}>
        <GridBackdrop />
        <ErrorState
          title="Couldn't load the world map"
          description="Map data didn't load. Check your connection and try again."
          onRetry={overview.refetch}
          className="relative"
        />
      </section>
    );
  }
  if (overview.isPending || !overview.data) return <WorldExplorerLoading />;

  return <ExplorerView data={overview.data} selectedId={selectedId} />;
}

type ExplorerData = {
  bounds: WorldBounds;
  regions: Region[];
  markers: WorldMarker[];
  kind: "sample" | "snapshot" | "live";
};

function ExplorerView({ data, selectedId }: { data: ExplorerData; selectedId: string | null }) {
  const router = useRouter();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [layers, setLayers] = useState<Set<WorldLayerId>>(defaultLayers);
  // The layer chips fold away behind one button so they don't crowd the map.
  const [layersOpen, setLayersOpen] = useState(false);
  const [showUnplaced, setShowUnplaced] = useState(false);
  // Phones have no room for the floating legend; it opens as a bottom sheet instead.
  const [showLegend, setShowLegend] = useState(false);
  // The Browse panel and where it was, kept while a place is open so closing it returns there.
  const [browsing, setBrowsing] = useState(false);
  const [browsePath, setBrowsePath] = useState<BrowsePath>({ area: null, neighbourhood: null });
  const [mapFailed, setMapFailed] = useState(false);
  // Why the map couldn't start, so the fallback doesn't blame WebGL when it's something else.
  const [webglMissing, setWebglMissing] = useState(false);
  const { bounds: world, regions, markers } = data;

  const visible = useMemo(() => filterByLayers(markers, layers), [markers, layers]);
  const { placed, unplaced } = useMemo(() => splitByPlacement(visible), [visible]);
  const counts = useMemo(() => {
    const result: Partial<Record<WorldLayerId, number>> = {};
    for (const marker of markers) {
      const layer = marker.layer ?? "other";
      result[layer] = (result[layer] ?? 0) + 1;
    }
    return result;
  }, [markers]);
  const selectedMarker = markers.find((marker) => marker.locationId === selectedId) ?? null;

  // The control that opened the panel (marker, list item, search), so closing can return focus to it.
  const opener = useRef<HTMLElement | null>(null);
  const rememberOpener = () => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      opener.current = document.activeElement;
    }
  };

  const selectLocation = (marker: WorldMarker) => {
    rememberOpener();
    setShowUnplaced(false);
    router.push(locationHref(marker.locationId), { scroll: false });
  };
  const closePanel = () => {
    setShowUnplaced(false);
    if (selectedId) router.push("/world", { scroll: false });
    // Without this, focus falls to <body> when the panel (and its close button) unmounts.
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
  };

  const fitRegion = (region: Region) => {
    map?.fitBounds(boundsToLngLatBounds(region.bounds), { padding: WORLD_FIT_PADDING });
  };

  // Search and Browse cover every layer; switch on the place's layer so it appears on the map.
  const openPlace = (marker: WorldMarker) => {
    const layer = marker.layer ?? "other";
    if (!layers.has(layer)) setLayers(new Set([...layers, layer]));
    selectLocation(marker);
  };

  const onSearch = (result: SearchResult) => {
    if (result.kind === "region") fitRegion(result.region);
    else openPlace(result.marker);
  };

  const focusPlaces = (places: WorldMarker[], region?: Region) => {
    const bounds = region?.bounds ?? boundsOf(places);
    if (bounds) map?.fitBounds(boundsToLngLatBounds(bounds), { padding: WORLD_FIT_PADDING });
  };

  const openBrowse = () => {
    rememberOpener();
    setShowUnplaced(false);
    setBrowsing(true);
  };
  const closeBrowse = () => {
    setBrowsing(false);
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
  };

  // Bring the selected location into view, leaving room for the panel.
  const target = selectedMarker?.coordinate;
  useEffect(() => {
    if (!map || !target) return;
    const desktop = window.matchMedia("(min-width: 48rem)").matches;
    const padding = desktop
      ? { top: 130, bottom: 40, left: 40, right: 420 }
      : { top: 150, bottom: map.getContainer().clientHeight * 0.6, left: 20, right: 20 };
    map.flyTo({ center: worldToLngLat(target), zoom: Math.max(map.getZoom(), GTA_TILE_ZOOM.max - 1), padding });
  }, [map, target, world]);

  const panelOpen = !!selectedId || browsing || showLegend || showUnplaced;

  return (
    <section className={sectionClass} aria-labelledby="world-explorer-title">
      <h1 id="world-explorer-title" className="sr-only">
        World Explorer
      </h1>
      {mapFailed ? (
        <MapFallback markers={visible} regions={regions} onSelect={selectLocation} webglMissing={webglMissing} />
      ) : (
        <WorldMap
          world={world}
          onReady={setMap}
          onError={(error) => {
            // Handled: the explorer falls back to list mode.
            console.warn("World map unavailable:", error instanceof Error ? error.message : error);
            setWebglMissing(!supportsWebGL2());
            setMapFailed(true);
          }}
          className="absolute inset-0"
        />
      )}
      {map && (
        <PlaceLayers
          map={map}
          markers={placed}
          selectedId={selectedMarker?.id ?? null}
          onSelect={(id) => {
            const marker = markers.find((m) => m.id === id);
            if (marker) selectLocation(marker);
          }}
        />
      )}

      <p className="sr-only" aria-live="polite">
        Showing {placed.length} locations on the map and {unplaced.length} without a position.
      </p>

      {/* Top toolbar: search, region jump, category filters */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 md:p-4",
          panelOpen && "md:right-[25rem]",
        )}
      >
        <div className="pointer-events-auto flex gap-2 md:max-w-xl">
          <MapSearch
            // Region results zoom the map, so they are only offered when the map is running.
            regions={mapFailed ? [] : regions}
            markers={markers}
            onSelect={onSearch}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={browsing ? closeBrowse : openBrowse}
            aria-pressed={browsing}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-small backdrop-blur transition-colors",
              browsing
                ? "border-accent/60 bg-accent/10 text-fg"
                : "glass-control text-fg/85 hover:border-fg/40",
            )}
          >
            <MapIcon aria-hidden className="size-4 text-accent" />
            Browse
          </button>
        </div>
        <div className="pointer-events-auto flex max-w-full items-start gap-2">
          <button
            type="button"
            onClick={() => setLayersOpen((open) => !open)}
            aria-expanded={layersOpen}
            aria-controls="map-layer-chips"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 glass-control rounded-full px-3 text-meta font-medium text-fg transition-colors hover:border-fg/40 pointer-coarse:h-10"
          >
            <Layers aria-hidden className="size-3.5 text-accent" />
            Layers
            <span className="meta text-muted">{layers.size} on</span>
            <ChevronDown aria-hidden className={cn("size-3.5 text-muted transition-transform", layersOpen && "rotate-180")} />
          </button>
          <div id="map-layer-chips" hidden={!layersOpen} className="min-w-0 flex-1">
            <LayerFilter selected={layers} onChange={setLayers} counts={counts} />
          </div>
        </div>
      </div>

      {/* Bottom-left: legend and unplaced list */}
      {!mapFailed && (
        <div className="absolute bottom-3 left-3 z-10 hidden flex-col items-start gap-2 md:flex">
          <button
            type="button"
            onClick={() => {
              rememberOpener();
              setShowUnplaced(true);
            }}
            className="inline-flex items-center gap-2 glass-control rounded-md px-3 py-2 text-small hover:border-fg/40"
          >
            <ListTree aria-hidden className="size-4 text-muted" />
            Not on the map
            <span className="meta text-muted">{unplaced.length}</span>
          </button>
          <MapLegend />
        </div>
      )}

      {/* Bottom-right: zoom controls (mobile also gets the unplaced button here) */}
      {!mapFailed && (
        <div
          className={cn(
            "absolute right-3 bottom-3 z-10 flex flex-col items-end gap-2 transition-[right] duration-200",
            panelOpen && "md:right-[25.5rem]",
            panelOpen && "max-md:hidden",
          )}
        >
          <button
            type="button"
            onClick={() => {
              rememberOpener();
              setShowUnplaced(true);
            }}
            aria-label={`Not on the map, ${unplaced.length}`}
            className="glass-control flex size-10 items-center justify-center rounded-md text-muted md:hidden"
          >
            <ListTree aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              rememberOpener();
              setShowLegend(true);
            }}
            aria-label="Legend"
            className="glass-control flex size-10 items-center justify-center rounded-md text-muted md:hidden"
          >
            <Info aria-hidden className="size-4" />
          </button>
          <MapControls
            onZoomIn={() => map?.zoomIn()}
            onZoomOut={() => map?.zoomOut()}
            onReset={() => map?.fitBounds(boundsToLngLatBounds(world), { padding: WORLD_FIT_PADDING })}
          />
        </div>
      )}

      {data.kind !== "live" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center max-md:bottom-auto max-md:top-[6.75rem]">
          <Badge tone="signal" className="bg-midnight/90 backdrop-blur">
            {data.kind === "sample"
              ? "Sample data · placeholder grid, not the game map"
              : "Community layer · gtadb.org · CC BY 4.0 · unofficial"}
          </Badge>
        </div>
      )}

      <AnimatePresence>
        {selectedId ? (
          <LocationPanel
            key={`loc-${selectedId}`}
            id={selectedId}
            fallbackTitle={selectedMarker?.title}
            regions={regions}
            onClose={closePanel}
          />
        ) : browsing ? (
          <WorldPanel key="browse" title="Browse Leonida" onClose={closeBrowse}>
            <AreaBrowser
              regions={regions}
              markers={markers}
              destinations={DESTINATION_NAMES}
              path={browsePath}
              onPathChange={setBrowsePath}
              onFocus={focusPlaces}
              onSelectPlace={openPlace}
            />
          </WorldPanel>
        ) : showLegend ? (
          <WorldPanel
            key="legend"
            title="Legend"
            onClose={() => {
              setShowLegend(false);
              const target = opener.current;
              opener.current = null;
              if (target?.isConnected) target.focus();
            }}
          >
            <LegendContent />
          </WorldPanel>
        ) : showUnplaced ? (
          <WorldPanel key="unplaced" title="Not on the map" onClose={closePanel}>
            <LocationList
              markers={unplaced}
              regions={regions}
              onSelect={selectLocation}
              intro="These have no coordinate yet, so they aren't pinned on the map."
              emptyMessage="Everything in the current filter has a map position."
            />
          </WorldPanel>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function supportsWebGL2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/** Shown in place of the map when it can't start. The explorer keeps working as a list. */
function MapFallback({
  markers,
  regions,
  onSelect,
  webglMissing,
}: {
  markers: WorldMarker[];
  regions: Region[];
  onSelect: (marker: WorldMarker) => void;
  webglMissing: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pt-32 pb-6 md:px-4">
      <GridBackdrop />
      <div className="relative mx-auto flex max-w-xl flex-col gap-4">
        <div role="status" className="flex items-start gap-3 rounded-md border border-signal/40 bg-surface p-4">
          <MonitorX aria-hidden className="mt-0.5 size-5 shrink-0 text-signal" />
          <div className="flex flex-col gap-1">
            {webglMissing ? (
              <>
                <p className="text-small font-medium">The interactive map can&apos;t start in this browser</p>
                <p className="text-small text-muted">
                  It needs WebGL2, which is turned off or not supported here (check that hardware acceleration is
                  on). You can still browse and open every location below.
                </p>
              </>
            ) : (
              <>
                <p className="text-small font-medium">The interactive map didn&apos;t load</p>
                <p className="text-small text-muted">
                  Reload the page to try again. You can still browse and open every location below.
                </p>
              </>
            )}
          </div>
        </div>
        <LocationList
          markers={markers}
          regions={regions}
          onSelect={onSelect}
          emptyMessage="No locations match the current filters."
        />
      </div>
    </div>
  );
}

function LocationPanel({
  id,
  fallbackTitle,
  regions,
  onClose,
}: {
  id: string;
  fallbackTitle?: string;
  regions: Region[];
  onClose: () => void;
}) {
  const location = useLocation(id);
  const title = location.data?.name ?? fallbackTitle ?? "Location";

  return (
    <WorldPanel title={title} onClose={onClose}>
      {location.isPending ? (
        <LoadingState label="Loading location" className="[&>div:last-child]:hidden" />
      ) : location.isError ? (
        <ErrorState description="This location didn't load." onRetry={() => location.refetch()} className="py-6" />
      ) : !location.data ? (
        <EmptyState
          title="Location not found"
          description="It may have been removed, or the link is wrong."
          action={{ label: "Back to the map", href: "/world" }}
          className="py-6"
        />
      ) : (
        <LocationDetails
          location={location.data}
          region={regions.find((region) => region.id === location.data!.regionId) ?? null}
        />
      )}
    </WorldPanel>
  );
}
