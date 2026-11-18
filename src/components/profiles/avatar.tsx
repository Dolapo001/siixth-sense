import { cn } from "@/lib/utilities/cn";
import { AvatarArt, type AvatarPresetId } from "./avatar-presets";

const sizes = {
  xs: "size-5 text-[0.5rem]",
  sm: "size-8 text-meta",
  md: "size-10 text-small",
  lg: "size-20 text-title",
} as const;

function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** Preset avatar, profile picture, or initials. Decorative: the name is always shown beside it. */
export function Avatar({
  name,
  url,
  preset,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  preset?: AvatarPresetId | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (preset) {
    return <AvatarArt preset={preset} className={cn("shrink-0 rounded-full", sizes[size], className)} />;
  }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar host unknown until the API exists
    return <img src={url} alt="" loading="lazy" decoding="async" className={cn("shrink-0 rounded-full object-cover", sizes[size], className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated font-semibold text-fg",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
