import { cn } from "@/lib/utilities/cn";

export type BadgeTone = "neutral" | "accent" | "signal" | "tentative";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-elevated text-muted",
  accent: "border-accent/40 bg-accent/10 text-accent",
  signal: "border-signal/40 bg-signal/10 text-signal",
  /** Dashed outline for unconfirmed information (AI suggestions). */
  tentative: "border-dashed border-muted/70 text-fg",
};

type BadgeProps = React.ComponentProps<"span"> & { tone?: BadgeTone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-meta font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
