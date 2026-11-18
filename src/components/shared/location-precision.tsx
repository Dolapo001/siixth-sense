import { CircleDashed, CircleHelp, Crosshair, Map as MapIcon, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { LocationPrecision } from "@/types/intelligence";

const config: Record<LocationPrecision, { label: string; icon: LucideIcon; tone: BadgeTone }> = {
  confirmed: { label: "Confirmed coordinate", icon: Crosshair, tone: "accent" },
  approximate: { label: "Approximate coordinate", icon: CircleDashed, tone: "tentative" },
  region: { label: "Region only", icon: MapIcon, tone: "neutral" },
  unknown: { label: "Location unknown", icon: CircleHelp, tone: "neutral" },
};

export function LocationPrecisionBadge({
  precision,
  className,
}: {
  precision: LocationPrecision;
  className?: string;
}) {
  const { label, icon: Icon, tone } = config[precision];
  return (
    <Badge tone={tone} className={className} data-precision={precision}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}
