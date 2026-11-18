"use client";

import { worldLayers, type WorldLayerId } from "@/features/world/layers";
import { cn } from "@/lib/utilities/cn";

type LayerFilterProps = {
  selected: ReadonlySet<WorldLayerId>;
  onChange: (next: Set<WorldLayerId>) => void;
  /** Places per layer, shown on each chip. */
  counts: Partial<Record<WorldLayerId, number>>;
};

const chip =
  "inline-flex h-8 pointer-coarse:h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-meta font-medium transition-colors [&_svg]:size-3.5";

/** Map layers as toggle chips. Layers with no places are left out. */
export function LayerFilter({ selected, onChange, counts }: LayerFilterProps) {
  const toggle = (id: WorldLayerId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label="Map layers"
      className="flex gap-1.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,#000_92%,transparent)] [scrollbar-width:none]"
    >
      {worldLayers
        .filter((layer) => (counts[layer.id] ?? 0) > 0)
        .map(({ id, label, icon: Icon }) => {
          const on = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={cn(
                chip,
                on
                  ? "border-accent/50 bg-accent/10 text-fg"
                  : "border-border-strong/70 bg-surface/90 text-muted backdrop-blur hover:text-fg",
              )}
            >
              <Icon aria-hidden className={on ? "text-accent" : undefined} />
              {label}
              <span className="meta text-muted">{counts[id]}</span>
            </button>
          );
        })}
    </div>
  );
}
