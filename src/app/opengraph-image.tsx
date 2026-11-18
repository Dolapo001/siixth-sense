import { ImageResponse } from "next/og";
import { OpenGraphImage } from "@/components/brand/brand-images";

export const alt = "Sixth Sense — See beyond the scene.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OpenGraphImage />, size);
}
