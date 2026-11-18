"use client";

import { MotionConfig } from "motion/react";

/**
 * Makes Motion animations follow the user's reduced-motion setting. Wrap only
 * the areas that use Motion (landing, world explorer, analysis), so the rest
 * of the app doesn't load the library.
 */
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
