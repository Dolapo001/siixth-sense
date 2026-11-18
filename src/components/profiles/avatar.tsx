import { cn } from "@/lib/utilities/cn";

const sizes = { sm: "size-8 text-meta", md: "size-10 text-small", lg: "size-20 text-title" } as const;

function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** Profile picture, or initials when there isn't one. Decorative: the name is always shown beside it. */
export function Avatar({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
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
