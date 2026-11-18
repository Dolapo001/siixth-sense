"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { categoryConfig } from "@/features/world/categories";
import { discoveryCategories } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

export function MapLegend({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="w-56 rounded-md border border-border bg-surface/95 backdrop-blur">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-small font-medium"
      >
        Legend
        <ChevronDown aria-hidden className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-3 border-t border-border px-3 py-3">
        <ul className="flex flex-col gap-1.5">
          {discoveryCategories.map((category) => {
            const { plural, icon: Icon } = categoryConfig[category];
            return (
              <li key={category} className="flex items-center gap-2 text-meta">
                <Icon aria-hidden className={cn("size-3.5", category === "hidden" ? "text-signal" : "text-muted")} />
                {plural}
              </li>
            );
          })}
        </ul>
        <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-meta">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-3.5 rounded-full border border-fg/70" />
            Confirmed coordinate
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-3.5 rounded-full border border-dashed border-fg/70" />
            Approximate (dashed circle shows uncertainty)
          </li>
          <li className="flex items-center gap-2 text-muted">
            <span aria-hidden className="size-3.5" />
            Region-only and unknown locations are listed, not pinned
          </li>
        </ul>
      </div>
    </div>
  );
}
