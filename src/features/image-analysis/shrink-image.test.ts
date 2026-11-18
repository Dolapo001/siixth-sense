import { describe, expect, it, vi } from "vitest";
import { fitForUpload, ImageTooLargeError, type Encode } from "./shrink-image";

const MB = 1024 * 1024;
const file = (bytes: number, name = "shot.png", type = "image/png") => new File([new Uint8Array(bytes)], name, { type });

/** A decoded image of the given size; close() is tracked so the bitmap is always released. */
const bitmap = (width: number, height: number) => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;
const decodeTo = (image: ImageBitmap) => vi.fn(async () => image);

/** Fake encoder: output size proportional to pixels × quality, so smaller/lower-quality steps shrink it. */
const encoder = (bytesPerPixelAtFull: number) =>
  vi.fn<Encode>(async (_image, width, height, quality) => new Blob([new Uint8Array(Math.round(width * height * bytesPerPixelAtFull * quality))]));

describe("fitForUpload", () => {
  it("sends a screenshot that already fits untouched", async () => {
    const small = file(2 * MB);
    const decode = vi.fn();
    expect(await fitForUpload(small, { decode })).toBe(small);
    expect(decode).not.toHaveBeenCalled();
  });

  it("re-encodes a large 4K screenshot as a JPEG under the limit, at full size if it can", async () => {
    const image = bitmap(3840, 2160);
    const encode = encoder(0.4); // ≈3 MB at quality 0.92
    const fitted = await fitForUpload(file(18 * MB, "vice-beach.png"), { decode: decodeTo(image), encode });
    expect(fitted).toMatchObject({ name: "vice-beach.jpg", type: "image/jpeg" });
    expect(fitted.size).toBeLessThanOrEqual(4 * MB);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls[0]!.slice(1)).toEqual([3840, 2160, 0.92]);
    expect(image.close).toHaveBeenCalled();
  });

  it("caps the longest side at 4K, then steps down quality and size until it fits", async () => {
    const encode = encoder(0.8); // 8K source: too big at full 4K size, fits after shrinking
    const fitted = await fitForUpload(file(30 * MB), { decode: decodeTo(bitmap(7680, 4320)), encode });
    expect(encode.mock.calls[0]!.slice(1)).toEqual([3840, 2160, 0.92]);
    const [, width, height] = encode.mock.lastCall!;
    expect([width, height]).toEqual([2880, 1620]);
    expect(fitted.size).toBeLessThanOrEqual(4 * MB);
  });

  it("gives up with a clear message when nothing fits, and still releases the image", async () => {
    const image = bitmap(3840, 2160);
    const encode = vi.fn<Encode>(async () => new Blob([new Uint8Array(5 * MB)]));
    await expect(fitForUpload(file(20 * MB), { decode: decodeTo(image), encode })).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(image.close).toHaveBeenCalled();
  });
});
