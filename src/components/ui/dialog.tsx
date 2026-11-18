"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import { Button } from "./button";

export type DialogVariant = "modal" | "drawer" | "sheet" | "responsive";

const variants: Record<DialogVariant, string> = {
  modal: "w-[calc(100%-2rem)] max-w-lg rounded-lg [--dialog-enter:translateY(8px)_scale(0.98)]",
  drawer:
    "m-0 ml-auto h-dvh max-h-none w-full max-w-md border-y-0 border-r-0 [--dialog-enter:translateX(100%)]",
  sheet:
    "m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-lg border-x-0 border-b-0 [--dialog-enter:translateY(100%)]",
  /** Bottom sheet on mobile, right drawer from md up. */
  responsive:
    "m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-lg border-x-0 border-b-0 [--dialog-enter:translateY(100%)] md:mt-0 md:ml-auto md:h-dvh md:max-h-none md:max-w-md md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:[--dialog-enter:translateX(100%)]",
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Modal, drawer and bottom sheet built on native <dialog>: the browser
 * provides focus containment, inert background and Escape to close.
 * Focus returns to the element that opened it.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "modal",
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "sid-dialog border border-border bg-surface p-0 text-fg backdrop:bg-transparent",
        variants[variant],
        className,
      )}
      onClose={() => {
        onOpenChange(false);
        returnFocus.current?.focus();
      }}
      onClick={(event) => {
        // A click on the <dialog> element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-heading font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-small text-muted">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X aria-hidden />
          </Button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
