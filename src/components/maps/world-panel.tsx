"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelFromRight } from "@/lib/motion";

type WorldPanelProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Non-modal panel over the map: right side panel on md+, bottom sheet on
 * mobile. The map stays usable behind it. Escape closes it and focus moves
 * to the heading when it opens so screen readers announce the new content.
 */
export function WorldPanel({ title, onClose, children }: WorldPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

  return (
    <motion.aside
      aria-label={title}
      variants={panelFromRight}
      initial="hidden"
      animate="visible"
      exit="exit"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[60%] flex-col glass-sheet rounded-t-lg border-b-0 md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-96 md:rounded-lg md:border-b md:border-b-white/10"
    >
      <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border md:hidden" />
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 ref={headingRef} tabIndex={-1} className="text-heading font-semibold outline-none">
          {title}
        </h2>
        <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose} className="-mt-1 -mr-2 shrink-0">
          <X aria-hidden />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </motion.aside>
  );
}
