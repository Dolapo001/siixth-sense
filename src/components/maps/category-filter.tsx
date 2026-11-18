"use client";

import { categoryConfig } from "@/features/world/categories";
import { discoveryCategories, type DiscoveryCategory } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

type CategoryFilterProps = {
  selected: ReadonlySet<DiscoveryCategory>;
  onChange: (next: Set<DiscoveryCategory>) => void;
  /** Visible marker count per category, shown on each chip. */
  counts?: Partial<Record<DiscoveryCategory, number>>;
};

const chip =
  "inline-flex h-8 pointer-coarse:h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-meta font-medium transition-colors [&_svg]:size-3.5";

export function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  const allOn = selected.size === discoveryCategories.length;

  const toggle = (category: DiscoveryCategory) => {
    const next = new Set(selected);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onChange(next);
  };

  return (
    <div role="group" aria-label="Filter by category" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
      <button
        type="button"
        aria-pressed={allOn}
        onClick={() => onChange(new Set(discoveryCategories))}
        className={cn(chip, allOn ? "border-accent/50 bg-accent/10 text-accent" : "border-border-strong bg-surface/95 text-muted hover:text-fg")}
      >
        All
      </button>
      {discoveryCategories.map((category) => {
        const { plural, icon: Icon } = categoryConfig[category];
        const on = selected.has(category);
        return (
          <button
            key={category}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(category)}
            className={cn(
              chip,
              on ? "border-border-strong bg-surface-elevated text-fg" : "border-border-strong/60 bg-surface/80 text-muted line-through decoration-muted/50",
            )}
          >
            <Icon aria-hidden />
            {plural}
            {counts?.[category] !== undefined && <span className="meta text-muted no-underline">{counts[category]}</span>}
          </button>
        );
      })}
    </div>
  );
}
