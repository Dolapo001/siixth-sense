import Link from "next/link";
import { MapPin, ScanLine } from "lucide-react";
import { ConfidenceLabel } from "@/components/shared/confidence-label";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { categoryConfig } from "@/features/world/categories";
import { locationHref } from "@/features/world/routing";
import type { Detection } from "@/features/image-analysis/types";
import { cn } from "@/lib/utilities/cn";

type DetectionListProps = {
  detections: Detection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** One card per detected entity. Selecting a card highlights its box, and vice versa. */
export function DetectionList({ detections, selectedId, onSelect }: DetectionListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {detections.map((detection) => {
        const selected = detection.id === selectedId;
        const { label: categoryLabel, icon: Icon } = categoryConfig[detection.category];
        return (
          <li
            key={detection.id}
            className={cn(
              "rounded-md border bg-surface transition-colors",
              selected ? "border-accent/60" : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(detection.id)}
              aria-pressed={selected}
              className="flex w-full items-start gap-3 p-4 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body font-semibold">{detection.label}</span>
                  <span className="text-meta text-muted">{categoryLabel}</span>
                </span>
                <ConfidenceLabel score={detection.confidence} level={detection.confidenceLevel} />
              </span>
            </button>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <VerificationBadge status={detection.verification} />
                {!detection.box && (
                  <span className="inline-flex items-center gap-1.5 text-meta text-muted">
                    <ScanLine aria-hidden className="size-3.5" />
                    Position in screenshot not provided
                  </span>
                )}
              </div>
              {detection.description && <p className="text-small text-muted">{detection.description}</p>}
              {detection.evidence.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="eyebrow">Evidence</p>
                  <ul className="list-disc pl-5 text-small text-muted">
                    {detection.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(detection.relatedLocations.length > 0 || detection.relatedDiscoveries.length > 0) && (
                <ul className="flex flex-col gap-1.5">
                  {detection.relatedLocations.map((location) => (
                    <li key={location.id} className="flex flex-wrap items-center gap-2">
                      <Link
                        href={locationHref(location.id)}
                        className="inline-flex items-center gap-1.5 text-small text-accent hover:underline"
                      >
                        <MapPin aria-hidden className="size-3.5" />
                        {location.name}
                      </Link>
                      <LocationPrecisionBadge precision={location.precision} />
                    </li>
                  ))}
                  {detection.relatedDiscoveries.map((discovery) => (
                    <li key={discovery.id}>
                      <Link href={`/discoveries/${discovery.id}`} className="text-small text-accent hover:underline">
                        {discovery.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
