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

/** Map layers as toggle chips, with All / None shortcuts. Layers with no places are left out. */
export function LayerFilter({ selected, onChange, counts }: LayerFilterProps) {
  const available = worldLayers.filter((layer) => (counts[layer.id] ?? 0) > 0);
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
      className="flex flex-wrap gap-1.5"
    >
      {[
        { label: "All", next: available.map((layer) => layer.id), on: available.every((l) => selected.has(l.id)) },
        { label: "None", next: [], on: selected.size === 0 },
      ].map(({ label, next, on }) => (
        <button
          key={label}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(new Set(next))}
          className={cn(
            chip,
            on
              ? "border-accent/50 bg-accent/10 text-fg"
              : "border-border-strong/70 bg-surface/90 text-muted backdrop-blur hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
      <span aria-hidden className="my-1 w-px shrink-0 bg-border" />
      {available.map(({ id, label, icon: Icon }) => {
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
