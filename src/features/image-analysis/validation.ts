import { z } from "zod";

export type UploadConstraints = {
  maxBytes: number;
  /** MIME types the service accepts. Images only; video is out of scope. */
  acceptedTypes: readonly string[];
};

/** Human-readable list, e.g. "PNG, JPEG or WebP". */
export function describeTypes(types: readonly string[]) {
  const names = types.map((t) => (t === "image/webp" ? "WebP" : t.replace("image/", "").toUpperCase()));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : (names[0] ?? "");
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Zod schema for a screenshot file under the given constraints. */
export function screenshotSchema({ maxBytes, acceptedTypes }: UploadConstraints) {
  return z
    .instanceof(File, { message: "Choose a screenshot to upload." })
    .refine((file) => file.size > 0, "This file is empty.")
    .refine(
      (file) => acceptedTypes.includes(file.type),
      `Only ${describeTypes(acceptedTypes)} images are supported. Videos aren't supported yet.`,
    )
    .refine((file) => file.size <= maxBytes, `Screenshots must be ${formatBytes(maxBytes)} or smaller.`);
}

/** Returns the first validation message, or null if the file is acceptable. */
export function validateScreenshot(file: File, constraints: UploadConstraints): string | null {
  const result = screenshotSchema(constraints).safeParse(file);
  return result.success ? null : (result.error.issues[0]?.message ?? "This file can't be uploaded.");
}
