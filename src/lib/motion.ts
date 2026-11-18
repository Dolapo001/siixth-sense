import type { Transition, Variants } from "motion/react";

/**
 * Shared motion presets. Keep movement short and purposeful: never animate
 * fake processing, and never hold back content behind an animation.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">.
 */

export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
} as const;

export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export const transition = {
  fast: { duration: duration.fast, ease: easeOutExpo },
  base: { duration: duration.base, ease: easeOutExpo },
  slow: { duration: duration.slow, ease: easeOutExpo },
} satisfies Record<string, Transition>;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.base },
};

/** For panels entering from the right (location panel, intelligence sidebar). */
export const panelFromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transition.base },
  exit: { opacity: 0, x: 24, transition: transition.fast },
};

/** Parent variant that staggers children (lists of detections, results). */
export const stagger = (step = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step } },
});
