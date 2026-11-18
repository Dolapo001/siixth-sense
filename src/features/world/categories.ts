import {
  Car,
  CalendarClock,
  Eye,
  Landmark,
  PawPrint,
  Package,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { DiscoveryCategory } from "./types";

/** Markers are told apart by icon (shape), not colour, so category never relies on colour alone. */
export const categoryConfig: Record<DiscoveryCategory, { label: string; plural: string; icon: LucideIcon }> = {
  location: { label: "Location", plural: "Locations & landmarks", icon: Landmark },
  vehicle: { label: "Vehicle", plural: "Vehicles", icon: Car },
  character: { label: "Character", plural: "Characters & NPCs", icon: UserRound },
  wildlife: { label: "Wildlife", plural: "Wildlife", icon: PawPrint },
  object: { label: "Object", plural: "Objects & collectibles", icon: Package },
  event: { label: "Event", plural: "Events & activities", icon: CalendarClock },
  hidden: { label: "Hidden discovery", plural: "Hidden discoveries", icon: Eye },
};
