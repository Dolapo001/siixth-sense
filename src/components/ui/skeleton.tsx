import { cn } from "@/lib/utilities/cn";

/** Placeholder block shown while real content loads. Hidden from assistive tech; pair with a status message. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-surface-elevated motion-safe:animate-pulse", className)} />;
}
