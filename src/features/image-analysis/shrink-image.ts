/*
 * Uploads go through this app's /api/backend proxy, and Vercel caps a
 * function's request body at 4.5 MB. Full-resolution screenshots (a 4K PNG is
 * often 10–20 MB) are re-encoded in the browser to fit; the backend re-encodes
 * every image anyway, so nothing it relies on is lost.
 */

/** Largest upload sent through the proxy: under Vercel's 4.5 MB, leaving room for the multipart wrapper. */
export const PROXY_UPLOAD_LIMIT = 4 * 1024 * 1024;

/** Largest original a player may pick, since it's shrunk before upload. */
export const PICKABLE_LIMIT = 40 * 1024 * 1024;

/** Longest side after shrinking: 4K keeps signs and plates legible for the analysis. */
const MAX_SIDE = 3840;
const QUALITIES = [0.92, 0.85, 0.75];

export type Encode = (image: ImageBitmap, width: number, height: number, quality: number) => Promise<Blob>;

const encodeJpeg: Encode = async (image, width, height, quality) => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't resize images.");
  context.drawImage(image, 0, 0, width, height);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
};

export class ImageTooLargeError extends Error {
  constructor() {
    super("This screenshot is too large to upload, even after shrinking it. Try a smaller one.");
  }
}

/**
 * The file as is when it already fits, otherwise a JPEG that does: first at
 * full size (up to 4K), then at lower quality, then at smaller sizes.
 */
export async function fitForUpload(
  file: File,
  // `decode` is wrapped so createImageBitmap is only looked up when a file needs shrinking: a bare
  // default is evaluated on every call, and throws where it doesn't exist (Safari < 15, jsdom).
  { limit = PROXY_UPLOAD_LIMIT, decode = (f: File) => createImageBitmap(f), encode = encodeJpeg } = {},
): Promise<File> {
  if (file.size <= limit) return file;
  const image = await decode(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    for (const step of [1, 0.75, 0.5]) {
      const width = Math.max(1, Math.round(image.width * scale * step));
      const height = Math.max(1, Math.round(image.height * scale * step));
      for (const quality of QUALITIES) {
        const blob = await encode(image, width, height, quality);
        if (blob.size <= limit) {
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
        }
      }
    }
  } finally {
    image.close();
  }
  throw new ImageTooLargeError();
}
