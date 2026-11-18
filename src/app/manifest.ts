import type { MetadataRoute } from "next";
import { brandColors } from "@/components/brand/colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sixth Sense",
    short_name: "Sixth Sense",
    description:
      "See beyond the scene. Turn gameplay screenshots into intelligence, uncover discoveries and explore the world.",
    start_url: "/world",
    display: "standalone",
    background_color: brandColors.midnight,
    theme_color: brandColors.midnight,
    icons: [
      { src: "/brand/sixth-sense-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
