import {
  CalendarClock,
  Car,
  Eye,
  Gem,
  Landmark,
  MapPin,
  Package,
  PawPrint,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { DiscoveryCategory } from "./types";

/** Markers are told apart by icon (shape), not colour, so category never relies on colour alone. */
export const categoryConfig: Record<DiscoveryCategory, { label: string; plural: string; icon: LucideIcon }> = {
  location: { label: "Location", plural: "Locations", icon: MapPin },
  landmark: { label: "Landmark", plural: "Landmarks", icon: Landmark },
  vehicle: { label: "Vehicle", plural: "Vehicles", icon: Car },
  character: { label: "Character", plural: "Characters", icon: UserRound },
  wildlife: { label: "Wildlife", plural: "Wildlife", icon: PawPrint },
  collectible: { label: "Collectible", plural: "Collectibles", icon: Gem },
  object: { label: "Object", plural: "Objects", icon: Package },
  event: { label: "Activity", plural: "Activities", icon: CalendarClock },
  hidden: { label: "Hidden discovery", plural: "Hidden discoveries", icon: Eye },
};
