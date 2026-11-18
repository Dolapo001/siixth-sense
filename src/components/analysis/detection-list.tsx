"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, ScanLine } from "lucide-react";
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

/**
 * One card per detected entity, numbered like its box on the screenshot.
 * Cards stay compact (name and confidence); the selected one opens to show its
 * evidence and links. Selecting a card highlights its box, and vice versa, and
 * picking a box scrolls its card into view.
 */
export function DetectionList({ detections, selectedId, onSelect }: DetectionListProps) {
  const items = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!selectedId) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    items.current.get(selectedId)?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <ul className="flex flex-col gap-2">
      {detections.map((detection, index) => {
        const selected = detection.id === selectedId;
        const { label: categoryLabel, icon: Icon } = categoryConfig[detection.category];
        const detailsId = `detection-${detection.id}-details`;
        return (
          <li
            key={detection.id}
            ref={(node) => {
              if (node) items.current.set(detection.id, node);
              else items.current.delete(detection.id);
            }}
            className={cn(
              "scroll-mt-24 rounded-md border bg-surface transition-colors",
              selected ? "border-accent/60" : "border-border hover:border-border-strong",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(detection.id)}
              aria-pressed={selected}
              aria-expanded={selected}
              aria-controls={detailsId}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold",
                  selected ? "bg-accent text-midnight" : "bg-surface-elevated text-muted",
                )}
              >
                {index + 1}
              </span>
              <span className="sr-only">{`Detection ${index + 1}: `}</span>
              <Icon aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="truncate text-body font-semibold">{detection.label}</span>
                  <span className="text-meta text-muted">{categoryLabel}</span>
                </span>
                <ConfidenceLabel score={detection.confidence} level={detection.confidenceLevel} />
              </span>
              <ChevronDown
                aria-hidden
                className={cn("size-4 shrink-0 text-muted transition-transform", selected && "rotate-180")}
              />
            </button>
            {selected && (
              <div id={detailsId} className="flex flex-col gap-3 border-t border-border px-4 py-3">
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
            )}
          </li>
        );
      })}
    </ul>
  );
}
