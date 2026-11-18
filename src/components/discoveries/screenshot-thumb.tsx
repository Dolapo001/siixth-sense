import { ImageOff } from "lucide-react";
import { categoryConfig } from "@/features/world/categories";
import type { DiscoveryCategory } from "@/features/world/types";
import { cn } from "@/lib/utilities/cn";

type ScreenshotThumbProps = {
  screenshot: { url: string; alt: string } | null;
  category: DiscoveryCategory;
  className?: string;
  /** Larger icon for lead and detail images. */
  size?: "sm" | "lg";
};

/**
 * A discovery's screenshot, or an honest placeholder frame when there isn't
 * one. Never substitutes stock or generated game imagery.
 */
export function ScreenshotThumb({ screenshot, category, className, size = "sm" }: ScreenshotThumbProps) {
  const Icon = categoryConfig[category].icon;
  if (screenshot) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image host unknown until the API exists
      <img
        src={screenshot.url}
        alt={screenshot.alt}
        loading="lazy"
        className={cn("aspect-video w-full rounded-md object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "@container relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-border bg-surface",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"
      />
      <div className="relative flex flex-col items-center gap-1.5 text-muted">
        <Icon aria-hidden className={size === "lg" ? "size-10" : "size-6"} />
        {/* Narrow thumbnails show just the icon; the text stays for screen readers. */}
        <span className={cn("flex items-center gap-1 @max-[9rem]:sr-only", size === "lg" ? "text-small" : "text-meta")}>
          <ImageOff aria-hidden className="size-3" />
          No screenshot
        </span>
      </div>
    </div>
  );
}
