/*
 * ⚠ LANDING PAGE ILLUSTRATION FIXTURES — not live data.
 *
 * Everything here is demonstration content for the marketing page: original
 * artwork, example detections and example discoveries. Each is labelled
 * "Illustration" or "Example" in the UI. Nothing here is a real GTA VI
 * location, discovery or recognition result, and no statistics are shown.
 *
 * To swap in licensed imagery, change the `src` values below (see
 * docs/landing-assets.md).
 */

import type { DiscoveryCategory } from "@/features/world/types";
import type { VerificationStatus } from "@/types/intelligence";

export type LandingImage = { src: string; alt: string; width: number; height: number };

/** Every image slot on the landing page. Replace `src` with licensed assets when available. */
export const landingImages = {
  hero: {
    src: "/landing/hero-coast-sunset.svg",
    alt: "Illustrated coastal city at sunset: a skyline with an art-deco tower, a cable bridge and palm trees by the water.",
    width: 1920,
    height: 1080,
  },
  boulevard: {
    src: "/landing/boulevard-dusk.svg",
    alt: "Illustrated waterfront boulevard at dusk with a car, a tall tower across the bay and a flamingo by the water.",
    width: 1600,
    height: 1000,
  },
  neonStreet: {
    src: "/landing/neon-street-night.svg",
    alt: "Illustrated city street at night with neon signs and a car driving between tall buildings.",
    width: 1600,
    height: 1000,
  },
  marsh: {
    src: "/landing/marsh-dusk.svg",
    alt: "Illustrated wetland at dusk with two flamingos among reeds and a distant skyline.",
    width: 1600,
    height: 1000,
  },
  pier: {
    src: "/landing/pier-sunset.svg",
    alt: "Illustrated pier at sunset with a Ferris wheel and the sun reflecting on the sea.",
    width: 1600,
    height: 1000,
  },
  skylineNight: {
    src: "/landing/skyline-night.svg",
    alt: "Illustrated city skyline at night under a full moon, its lights reflected in the water.",
    width: 1920,
    height: 1080,
  },
} satisfies Record<string, LandingImage>;

export type DemoDetection = {
  id: string;
  index: string;
  label: string;
  category: DiscoveryCategory;
  /** Illustrative confidence for the demo. Not a model output. */
  confidence: number;
  /** Box relative to the boulevard artwork, 0–1. Matches the subjects drawn by scripts/generate-landing-art.mjs. */
  box: { x: number; y: number; width: number; height: number };
  detail: string;
};

/** Example detections over the boulevard artwork (car, tower, flamingo). */
export const demoDetections: DemoDetection[] = [
  {
    id: "vehicle",
    index: "01",
    label: "Vehicle detected",
    category: "vehicle",
    confidence: 0.91,
    box: { x: 0.255, y: 0.745, width: 0.185, height: 0.1 },
    detail: "Two-door coupe, profile view",
  },
  {
    id: "location",
    index: "02",
    label: "Possible location match",
    category: "location",
    confidence: 0.64,
    box: { x: 0.7, y: 0.035, width: 0.075, height: 0.53 },
    detail: "Art-deco tower across the bay",
  },
  {
    id: "wildlife",
    index: "03",
    label: "Wildlife identified",
    category: "wildlife",
    confidence: 0.83,
    box: { x: 0.125, y: 0.55, width: 0.065, height: 0.17 },
    detail: "Wading bird by the waterline",
  },
];

export type ExampleDiscovery = {
  id: string;
  category: DiscoveryCategory;
  categoryLabel: string;
  title: string;
  description: string;
  location: string | null;
  verification: VerificationStatus | null;
  image: LandingImage;
  /** CSS object-position to frame the subject in this crop. */
  focus?: string;
};

/** Example cards for the discoveries gallery. Illustrations only. */
export const exampleDiscoveries: ExampleDiscovery[] = [
  {
    id: "vehicle",
    category: "vehicle",
    categoryLabel: "Vehicle sighting",
    title: "A coupe on the night strip",
    description: "Spotted between neon signs. Matched against known vehicle references.",
    location: "Downtown (example)",
    verification: "verified",
    image: landingImages.neonStreet,
    // Anchored to the bottom so the car stays in frame in the tall featured crop.
    focus: "50% 100%",
  },
  {
    id: "wildlife",
    category: "wildlife",
    categoryLabel: "Wildlife",
    title: "Flamingos in the wetlands",
    description: "A pair wading at dusk, far from the city lights.",
    location: "Wetlands (example)",
    verification: "awaiting_verification",
    image: landingImages.marsh,
    focus: "30% 70%",
  },
  {
    id: "hidden-location",
    category: "location",
    categoryLabel: "Hidden location",
    title: "The end of the old pier",
    description: "A quiet spot past the Ferris wheel that few players reach.",
    location: "Waterfront (example)",
    verification: "ai_suggested",
    image: landingImages.pier,
    focus: "65% 50%",
  },
  {
    id: "environment",
    category: "location",
    categoryLabel: "Environmental detail",
    title: "Tower lights at golden hour",
    description: "The skyline's tallest tower catching the last of the sun.",
    location: "Bayfront (example)",
    verification: "verified",
    // Not the hero image: that one is eager-loaded and shouldn't be reused lazily.
    image: landingImages.boulevard,
    focus: "75% 30%",
  },
  {
    id: "collectible",
    category: "object",
    categoryLabel: "Collectibles & objects",
    title: "Something under the neon",
    description: "An object half-hidden in a shop doorway on the night strip.",
    location: null,
    verification: "disputed",
    image: landingImages.neonStreet,
    focus: "8% 45%",
  },
  {
    id: "hidden",
    category: "hidden",
    categoryLabel: "Hidden discovery",
    title: "A light that shouldn't be there",
    description: "One window that stays lit across every screenshot of the skyline.",
    location: "Skyline (example)",
    verification: "ai_suggested",
    image: landingImages.skylineNight,
    focus: "55% 45%",
  },
];

export type ExampleRanking = {
  handle: string;
  /** Verified discoveries (counted only after community confirmation). */
  verified: number;
  /** Times they confirmed or disputed someone else's discovery. */
  reviews: number;
  reputation: number;
};

/**
 * Example contributors for the landing leaderboard. Illustrations only:
 * every handle says "example" and the panel is tagged as such.
 */
export const exampleRankings: ExampleRanking[] = [
  { handle: "example_harbourwatch", verified: 42, reviews: 118, reputation: 2310 },
  { handle: "example_neonscout", verified: 57, reviews: 64, reputation: 2140 },
  { handle: "example_marshlight", verified: 31, reviews: 203, reputation: 2465 },
  { handle: "example_keyrunner", verified: 48, reviews: 91, reputation: 1980 },
  { handle: "example_duskframe", verified: 26, reviews: 142, reputation: 1755 },
];
