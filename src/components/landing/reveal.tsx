"use client";

import { motion } from "motion/react";
import { easeOutExpo } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Upward travel in px. */
  y?: number;
};

/** Fades and lifts content in once, the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 18 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.6, ease: easeOutExpo, delay }}
    >
      {children}
    </motion.div>
  );
}
