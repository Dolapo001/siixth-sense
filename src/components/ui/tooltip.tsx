"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utilities/cn";

type TooltipTriggerProps = {
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
};

type TooltipProps = {
  content: string;
  side?: "top" | "right" | "bottom";
  /**
   * Use the tooltip as the trigger's accessible name (icon-only buttons).
   * Otherwise it's announced as a description.
   */
  asLabel?: boolean;
  className?: string;
  children: (trigger: TooltipTriggerProps) => React.ReactNode;
};

const sides = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
};

/** Shows on hover and keyboard focus; Escape dismisses it (WCAG 1.4.13). */
export function Tooltip({ content, side = "top", asLabel = false, className, children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children(asLabel ? { "aria-labelledby": id } : { "aria-describedby": id })}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "absolute z-50 rounded-sm border border-border bg-surface-elevated px-2 py-1 text-meta whitespace-nowrap text-fg transition-opacity",
          sides[side],
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
