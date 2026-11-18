"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { upcomingLayers, worldLayers } from "@/features/world/layers";
import { cn } from "@/lib/utilities/cn";

export function MapLegend({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="glass-control w-56 rounded-md">
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
      <div id={panelId} hidden={!open} className="border-t border-border px-3 py-3">
        <LegendContent />
      </div>
    </div>
  );
}

/** What the map's markers and layers mean. Also shown in a bottom sheet on phones. */
export function LegendContent() {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {worldLayers.map(({ id, label, icon: Icon }) => (
          <li key={id} className="flex items-center gap-2 text-meta">
            <Icon aria-hidden className="size-3.5 text-muted" />
            {label}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <p className="text-meta text-muted">Arrive with Sixth Sense data:</p>
        <ul className="flex flex-col gap-1.5">
          {upcomingLayers.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2 text-meta text-muted">
              <Icon aria-hidden className="size-3.5" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-meta">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3.5 rounded-full border-[1.5px] border-accent bg-surface-elevated" />
          Landmark
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3.5 rounded-full border-[1.5px] border-border-strong bg-surface-elevated" />
          Other place (icon shows its layer when zoomed in)
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-3.5 items-center justify-center rounded-full border border-accent/60 text-[0.5rem]"
          >
            3
          </span>
          Group of places: click to zoom in
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span aria-hidden className="size-3.5" />
          Positions are community-placed and unofficial
        </li>
      </ul>
    </div>
  );
}
