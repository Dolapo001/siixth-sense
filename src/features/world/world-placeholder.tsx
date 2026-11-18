import { UnavailableState } from "@/components/shared/states";

/**
 * Full-bleed map area with an honest "not connected" state.
 * The grid is decorative only; it is not a map and implies no locations.
 */
export function WorldPlaceholder({ description }: { description?: string }) {
  return (
    <section
      aria-labelledby="world-title"
      className="relative flex min-h-[calc(100dvh-7.5rem)] flex-1 items-center justify-center overflow-hidden md:min-h-dvh"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="relative flex flex-col items-center">
        <p className="eyebrow">World Explorer</p>
        <h1 id="world-title" className="sr-only">
          World Explorer
        </h1>
        <UnavailableState
          title="Map not connected"
          description={
            description ??
            "The interactive world map needs a permitted map dataset and location data from the Sixth Sense backend. Neither is connected yet."
          }
          action={{ label: "Browse discoveries", href: "/discoveries" }}
          className="py-6"
        />
      </div>
    </section>
  );
}
