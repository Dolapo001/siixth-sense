"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ListTree, MonitorX } from "lucide-react";
import { CategoryFilter } from "@/components/maps/category-filter";
import { LocationDetails } from "@/components/maps/location-details";
import { LocationList } from "@/components/maps/location-list";
import { MapControls } from "@/components/maps/map-controls";
import { MapLegend } from "@/components/maps/map-legend";
import { MapSearch } from "@/components/maps/map-search";
import { MarkerOverlay } from "@/components/maps/marker-overlay";
import { WorldPanel } from "@/components/maps/world-panel";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utilities/cn";
import { boundsToLngLatBounds, WORLD_FIT_PADDING, worldToLngLat } from "./coordinates";
import { GTA_TILE_ZOOM } from "./gta-map-config";
import { useLocation, useWorldOverview } from "./hooks";
import { createMarkerIndex, filterMarkers, splitByPlacement, type SearchResult } from "./markers";
import { discoveryCategories, type DiscoveryCategory, type Region, type WorldBounds, type WorldMarker } from "./types";
import { locationHref, selectedLocationFromPath } from "./routing";
import { WorldPlaceholder } from "./world-placeholder";

// MapLibre (~1 MB) loads on the client only, in parallel with the world data, instead of
// blocking the explorer's first render. The grid backdrop shows meanwhile.
const WorldMap = dynamic(() => import("@/components/maps/world-map").then((m) => m.WorldMap), { ssr: false });

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
  kind: "sample" | "live";
};

function ExplorerView({ data, selectedId }: { data: ExplorerData; selectedId: string | null }) {
  const router = useRouter();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [categories, setCategories] = useState<Set<DiscoveryCategory>>(() => new Set(discoveryCategories));
  const [showUnplaced, setShowUnplaced] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const { bounds: world, regions, markers } = data;

  const visible = useMemo(() => filterMarkers(markers, categories), [markers, categories]);
  const { placed, unplaced } = useMemo(() => splitByPlacement(visible), [visible]);
  const index = useMemo(() => createMarkerIndex(placed, world), [placed, world]);
  const counts = useMemo(() => {
    const result: Partial<Record<DiscoveryCategory, number>> = {};
    for (const marker of markers) result[marker.category] = (result[marker.category] ?? 0) + 1;
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

  const onSearch = (result: SearchResult) => {
    if (result.kind === "region") fitRegion(result.region);
    else selectLocation(result.marker);
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

  const panelOpen = !!selectedId || showUnplaced;

  return (
    <section className={sectionClass} aria-labelledby="world-explorer-title">
      <h1 id="world-explorer-title" className="sr-only">
        World Explorer
      </h1>
      {mapFailed ? (
        <MapFallback markers={visible} regions={regions} onSelect={selectLocation} />
      ) : (
        <WorldMap
          world={world}
          onReady={setMap}
          onError={(error) => {
            // Handled: the explorer falls back to list mode.
            console.warn("World map unavailable:", error instanceof Error ? error.message : error);
            setMapFailed(true);
          }}
          className="absolute inset-0"
        />
      )}
      {map && <MarkerOverlay map={map} index={index} world={world} selectedId={selectedId} onSelect={selectLocation} />}

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
            markers={visible}
            onSelect={onSearch}
            className="min-w-0 flex-1"
          />
          {!mapFailed && (
            <>
              <label className="sr-only" htmlFor="region-jump">
                Jump to region
              </label>
              <div className="w-32 shrink-0 md:w-44">
                <Select
                  id="region-jump"
                  value=""
                  onChange={(event) => {
                    const region = regions.find((r) => r.id === event.target.value);
                    if (region) fitRegion(region);
                  }}
                  className="bg-surface/95 backdrop-blur"
                >
                  <option value="" disabled>
                    Regions
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
        </div>
        <div className="pointer-events-auto max-w-full">
          <CategoryFilter selected={categories} onChange={setCategories} counts={counts} />
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
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 text-small backdrop-blur hover:border-muted"
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
            className="flex size-10 items-center justify-center rounded-md border border-border bg-surface/95 text-muted md:hidden"
          >
            <ListTree aria-hidden className="size-4" />
          </button>
          <MapControls
            onZoomIn={() => map?.zoomIn()}
            onZoomOut={() => map?.zoomOut()}
            onReset={() => map?.fitBounds(boundsToLngLatBounds(world), { padding: WORLD_FIT_PADDING })}
          />
        </div>
      )}

      {data.kind === "sample" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center max-md:bottom-auto max-md:top-[6.75rem]">
          <Badge tone="signal" className="bg-midnight/90 backdrop-blur">
            Sample data · placeholder grid, not the game map
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

/** Shown in place of the map when it can't start (e.g. no WebGL2). The explorer keeps working as a list. */
function MapFallback({
  markers,
  regions,
  onSelect,
}: {
  markers: WorldMarker[];
  regions: Region[];
  onSelect: (marker: WorldMarker) => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pt-32 pb-6 md:px-4">
      <GridBackdrop />
      <div className="relative mx-auto flex max-w-xl flex-col gap-4">
        <div role="status" className="flex items-start gap-3 rounded-md border border-signal/40 bg-surface p-4">
          <MonitorX aria-hidden className="mt-0.5 size-5 shrink-0 text-signal" />
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium">The interactive map can&apos;t start in this browser</p>
            <p className="text-small text-muted">
              It needs WebGL2, which is turned off or not supported here. You can still browse and open every location
              below.
            </p>
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
