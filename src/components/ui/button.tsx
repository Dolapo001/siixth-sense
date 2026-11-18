import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utilities/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "warning";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  /** Meaningful primary actions only. */
  primary: "bg-accent text-midnight hover:bg-fg",
  secondary: "border border-border bg-surface-elevated text-fg hover:border-muted",
  ghost: "text-muted hover:bg-surface-elevated hover:text-fg",
  /** Destructive or attention-worthy actions (dispute, report). Use sparingly. */
  warning: "border border-signal/60 text-signal hover:bg-signal/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small pointer-coarse:h-10",
  md: "h-10 px-4 text-small",
  lg: "h-12 px-6 text-body",
  icon: "size-10",
};

/** Class names for anything that should look like a button (e.g. next/link). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks. Only use while a real request is in flight. */
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="motion-safe:animate-spin" />}
      {children}
    </button>
  );
}
