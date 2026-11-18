import Image from "next/image";
import type { LandingImage } from "@/features/landing/fixtures";
import { cn } from "@/lib/utilities/cn";

type SceneImageProps = {
  image: LandingImage;
  className?: string;
  /** Above-the-fold images load eagerly with high fetch priority; everything else lazy-loads. */
  eager?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
};

/**
 * A landing-page image slot. The current artwork is SVG, which Next serves
 * as-is; when licensed raster images replace it, they're optimised automatically.
 */
export function SceneImage({ image, className, eager = false, sizes = "100vw", style }: SceneImageProps) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      unoptimized={image.src.endsWith(".svg")}
      className={cn("object-cover", className)}
      style={style}
    />
  );
}
