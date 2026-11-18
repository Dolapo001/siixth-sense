"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

type MapControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

const controlButton =
  "flex size-10 items-center justify-center text-muted transition-colors hover:bg-surface-elevated hover:text-fg [&_svg]:size-4";

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  return (
    <div className="flex flex-col overflow-visible rounded-md border border-border bg-surface/95 backdrop-blur">
      <Tooltip content="Zoom in" side="top" asLabel>
        {(props) => (
          <button type="button" onClick={onZoomIn} className={controlButton} {...props}>
            <Plus aria-hidden />
          </button>
        )}
      </Tooltip>
      <div aria-hidden className="h-px bg-border" />
      <Tooltip content="Zoom out" side="top" asLabel>
        {(props) => (
          <button type="button" onClick={onZoomOut} className={controlButton} {...props}>
            <Minus aria-hidden />
          </button>
        )}
      </Tooltip>
      <div aria-hidden className="h-px bg-border" />
      <Tooltip content="Show whole world" side="top" asLabel>
        {(props) => (
          <button type="button" onClick={onReset} className={controlButton} {...props}>
            <Maximize aria-hidden />
          </button>
        )}
      </Tooltip>
    </div>
  );
}
