import { BedDouble, Car, Factory, Gem, House, Landmark, MapPin, PawPrint, ScanSearch, Store, TrainFront, Trees, type LucideIcon } from "lucide-react";

/*
 * World map layers: kinds of place from the GTA VI landmark data, each
 * switchable on its own. Only the most useful are on at first, so the map
 * isn't flooded with every record.
 */

export const worldLayers = [
  {
    id: "landmarks",
    label: "Landmarks",
    icon: Landmark,
    defaultOn: true,
    tags: ["landmark", "government", "public", "events", "point-of-interest"],
  },
  {
    id: "leisure",
    label: "Hotels & leisure",
    icon: BedDouble,
    defaultOn: true,
    tags: ["hotel", "leisure", "restaurant", "recreation", "fastfood"],
  },
  { id: "transport", label: "Transport", icon: TrainFront, defaultOn: true, tags: ["transportation"] },
  { id: "nature", label: "Nature", icon: Trees, defaultOn: true, tags: ["natural", "agriculture"] },
  { id: "commercial", label: "Shops & offices", icon: Store, defaultOn: false, tags: ["retail", "office", "supermarket", "service"] },
  { id: "residential", label: "Residential", icon: House, defaultOn: false, tags: ["residential"] },
  { id: "industrial", label: "Industry & utilities", icon: Factory, defaultOn: false, tags: ["industrial", "utilities", "construction"] },
  { id: "other", label: "Unclassified places", icon: MapPin, defaultOn: false, tags: [] },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon; defaultOn: boolean; tags: readonly string[] }[];

export type WorldLayerId = (typeof worldLayers)[number]["id"];

export const layerConfig = Object.fromEntries(worldLayers.map((layer) => [layer.id, layer])) as Record<
  WorldLayerId,
  (typeof worldLayers)[number]
>;

export const defaultLayers = (): Set<WorldLayerId> =>
  new Set(worldLayers.filter((layer) => layer.defaultOn).map((layer) => layer.id));

/** The first layer whose tags match, in layer order; untagged places are "other". */
export function layerForTags(tags: readonly string[]): WorldLayerId {
  for (const layer of worldLayers) {
    if (layer.tags.some((tag) => tags.includes(tag))) return layer.id;
  }
  return "other";
}

/** Layers the brief calls for that need Sixth Sense's own data. Listed so their absence is explicit. */
export const upcomingLayers: { label: string; icon: LucideIcon }[] = [
  { label: "Discoveries", icon: ScanSearch },
  { label: "Collectibles", icon: Gem },
  { label: "Vehicle sightings", icon: Car },
  { label: "Wildlife sightings", icon: PawPrint },
];
