/*
 * The World Explorer with the backend connected: geography stays the pinned
 * gtadb community snapshot (the backend holds no map data yet), and Sixth
 * Sense's own discoveries from the backend are drawn on top as the
 * "Discoveries" layer.
 *
 * Location ids:
 *   L123              a gtadb place (the snapshot)
 *   discovery:<id>    a shared discovery with its own position
 *   location:<id>     a backend location (world/locations/{id})
 */

import { api, ApiError, type ApiPage } from "@/lib/api/client";
import { fromBackendCategory, toPrecision, toVerification } from "@/lib/api/mappers";
import { placeIdFromTags } from "@/features/discoveries/data/api-source";
import type { DiscoverySummary, LocationDetail, WorldMarker } from "../types";
import { createSnapshotWorldSource } from "./snapshot-source";
import type { WorldDataSource } from "./source";

type BackendMarker = {
  public_id: string;
  location: string | null;
  title: string;
  category: string;
  precision: string;
  coordinate: { x: number; y: number } | null;
  radius: number | null;
  region: string | null;
  verification: string;
};

type BackendDiscovery = {
  public_id: string;
  title: string;
  category: string;
  description: string;
  tags: string[] | null;
  verification: string;
  contributor: string | null;
  screenshot: { url: string; alt: string } | null;
  created_at: string;
};

type BackendLocation = {
  public_id: string;
  name: string;
  description: string;
  region: string | null;
  precision: string;
  coordinate: { x: number; y: number } | null;
  radius: number | null;
  verification: string;
  discoveries: { public_id: string; title: string; category: string; verification: string; submitted_at: string }[];
  related_entities: { public_id: string; name: string; category: string }[];
  activity: { discoveries: number; contributors: number; last_activity_at: string | null };
  screenshots: { public_id: string; url: string; alt: string }[];
};

const DISCOVERY = "discovery:";
const LOCATION = "location:";
/** How many recent discoveries are scanned for map places (see placeIdFromTags). */
const RECENT_LIMIT = 100;

const toSummary = (d: BackendDiscovery): DiscoverySummary => ({
  id: d.public_id,
  title: d.title,
  category: fromBackendCategory(d.category, d.tags),
  verification: toVerification(d.verification),
  submittedAt: d.created_at,
});

export function createApiWorldSource(): WorldDataSource {
  const snapshot = createSnapshotWorldSource();

  let recent: Promise<BackendDiscovery[]> | null = null;
  /** Recent public discoveries; the ones shared at a map place are pinned there. */
  const recentDiscoveries = () => {
    recent ??= api<ApiPage<BackendDiscovery>>("discoveries/", { query: { page_size: RECENT_LIMIT } })
      .then((page) => page.results)
      .catch(() => []);
    return recent;
  };
  const discoveriesAt = async (placeId: string) =>
    (await recentDiscoveries()).filter((d) => placeIdFromTags(d.tags) === placeId);

  async function discoveryMarkers(places: WorldMarker[]): Promise<WorldMarker[]> {
    const [backend, shared] = await Promise.all([
      api<BackendMarker[]>("world/markers/").catch(() => [] as BackendMarker[]),
      recentDiscoveries(),
    ]);
    const placeById = new Map(places.map((place) => [place.locationId, place]));

    const positioned = backend.map(
      (m): WorldMarker => ({
        id: `${DISCOVERY}${m.public_id}`,
        locationId: `${DISCOVERY}${m.public_id}`,
        title: m.title,
        category: fromBackendCategory(m.category),
        precision: toPrecision(m.precision),
        coordinate: m.coordinate,
        radius: m.radius ?? undefined,
        regionId: m.region,
        verification: toVerification(m.verification),
        layer: "discoveries",
      }),
    );
    const atPlaces = shared.flatMap((d): WorldMarker[] => {
      const place = placeById.get(placeIdFromTags(d.tags) ?? "");
      if (!place?.coordinate) return [];
      return [
        {
          id: `${DISCOVERY}${d.public_id}`,
          // Opens the place, which lists its discoveries.
          locationId: place.locationId,
          title: d.title,
          category: fromBackendCategory(d.category, d.tags),
          precision: place.precision,
          coordinate: place.coordinate,
          radius: place.radius,
          regionId: place.regionId,
          verification: toVerification(d.verification),
          layer: "discoveries",
          areas: place.areas,
        },
      ];
    });
    const seen = new Set(positioned.map((m) => m.id));
    return [...positioned, ...atPlaces.filter((m) => !seen.has(m.id))];
  }

  async function backendLocation(id: string): Promise<LocationDetail | null> {
    try {
      const l = await api<BackendLocation>(`world/locations/${encodeURIComponent(id)}/`);
      return {
        id: `${LOCATION}${l.public_id}`,
        name: l.name,
        regionId: l.region,
        description: l.description,
        precision: toPrecision(l.precision),
        coordinate: l.coordinate,
        radius: l.radius ?? undefined,
        verification: toVerification(l.verification),
        discoveries: l.discoveries.map((d) => ({
          id: d.public_id,
          title: d.title,
          category: fromBackendCategory(d.category),
          verification: toVerification(d.verification),
          submittedAt: d.submitted_at,
        })),
        relatedEntities: l.related_entities.map((e) => ({ id: e.public_id, name: e.name, category: fromBackendCategory(e.category) })),
        activity: {
          discoveries: l.activity.discoveries,
          contributors: l.activity.contributors,
          lastActivityAt: l.activity.last_activity_at,
        },
        screenshots: l.screenshots.map((s) => ({ id: s.public_id, url: s.url, alt: s.alt })),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  /** A discovery with its own position, shown as a one-discovery location. */
  async function discoveryLocation(id: string): Promise<LocationDetail | null> {
    const markers = await api<BackendMarker[]>("world/markers/");
    const marker = markers.find((m) => m.public_id === id);
    if (!marker) return null;
    return {
      id: `${DISCOVERY}${id}`,
      name: marker.title,
      regionId: marker.region,
      description: "A discovery shared by the Sixth Sense community.",
      precision: toPrecision(marker.precision),
      coordinate: marker.coordinate,
      radius: marker.radius ?? undefined,
      verification: toVerification(marker.verification),
      discoveries: [
        {
          id,
          title: marker.title,
          category: fromBackendCategory(marker.category),
          verification: toVerification(marker.verification),
          submittedAt: "",
        },
      ],
      relatedEntities: [],
      activity: { discoveries: 1, contributors: 1, lastActivityAt: null },
      screenshots: [],
    };
  }

  return {
    kind: "snapshot",
    getWorldBounds: () => snapshot.getWorldBounds(),
    listRegions: () => snapshot.listRegions(),
    async listMarkers() {
      const places = await snapshot.listMarkers();
      return [...(await discoveryMarkers(places)), ...places];
    },
    async getLocation(id) {
      if (id.startsWith(LOCATION)) return backendLocation(id.slice(LOCATION.length));
      if (id.startsWith(DISCOVERY)) return discoveryLocation(id.slice(DISCOVERY.length));

      const [place, shared] = await Promise.all([snapshot.getLocation(id), discoveriesAt(id)]);
      if (!place || shared.length === 0) return place;
      const contributors = new Set(shared.map((d) => d.contributor ?? d.public_id));
      return {
        ...place,
        discoveries: [...shared.map(toSummary), ...place.discoveries],
        activity: {
          discoveries: place.activity.discoveries + shared.length,
          contributors: place.activity.contributors + contributors.size,
          lastActivityAt: shared[0]?.created_at ?? place.activity.lastActivityAt,
        },
        screenshots: [
          ...shared.flatMap((d) => (d.screenshot ? [{ id: d.public_id, url: d.screenshot.url, alt: d.screenshot.alt }] : [])),
          ...place.screenshots,
        ],
      };
    },
  };
}
