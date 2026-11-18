import { staticMapSnippet } from "@/features/world/static-map";
import type { WorldCoordinate } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

type StaticMapProps = {
  center: WorldCoordinate;
  /** Metres across. */
  width?: number;
  aspect?: number;
  /** Accessible description, e.g. "Map around Vice Regal". */
  label: string;
  className?: string;
};

/**
 * A small, static look at the GTA VI map around a point (no map engine).
 * The pin marks the point; the dashed ring says the position is approximate.
 */
export function StaticMap({ center, width = 900, aspect = 16 / 9, label, className }: StaticMapProps) {
  const snippet = staticMapSnippet(center, { width, aspect });
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative overflow-hidden rounded-md border border-border bg-[#2f6aa6]", className)}
      style={{ aspectRatio: snippet.aspect }}
    >
      {snippet.tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element -- plain map tiles; next/image adds nothing here
        <img
          key={tile.src}
          src={tile.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ left: `${tile.left}%`, top: `${tile.top}%`, width: `${tile.width}%`, height: `${tile.height}%` }}
        />
      ))}
      <div aria-hidden className="absolute inset-0 bg-midnight/15" />
      <span
        aria-hidden
        className="absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/80 bg-accent/10"
        style={{ left: `${snippet.point.left}%`, top: `${snippet.point.top}%` }}
      />
      <span
        aria-hidden
        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-midnight bg-accent shadow"
        style={{ left: `${snippet.point.left}%`, top: `${snippet.point.top}%` }}
      />
    </div>
  );
}
