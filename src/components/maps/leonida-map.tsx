import { LEONIDA_ASPECT, leonidaTiles } from "@/features/world/leonida-mosaic";
import { cn } from "@/lib/utilities/cn";

const tiles = leonidaTiles();

/**
 * The whole GTA VI map of Leonida as static tiles, with an overlay for pins.
 * Children are positioned with leonidaPosition(). Credits the community map.
 */
export function LeonidaMap({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl border border-border bg-[#2f6aa6]", className)}
      style={{ aspectRatio: LEONIDA_ASPECT }}
    >
      {tiles.map((tile) => (
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
      {/* Darken slightly so pins and the dark UI read against the bright map art. */}
      <div aria-hidden className="absolute inset-0 bg-midnight/25" />
      {children}
      <p className="meta absolute top-2 right-2 rounded-sm bg-midnight/85 px-1.5 py-0.5 text-[0.6875rem] text-fg/85">
        Unofficial community map ·{" "}
        <a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          gtadb.org
        </a>{" "}
        · CC BY 4.0
      </p>
    </div>
  );
}
