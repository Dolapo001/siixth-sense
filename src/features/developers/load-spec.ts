import { cacheLife } from "next/cache";
import { validateOpenApi, type OpenApiDocument } from "./openapi";

export type SpecResult =
  { status: "unpublished" } | { status: "error"; message: string } | { status: "ok"; document: OpenApiDocument };

/**
 * Loads the backend's OpenAPI document from SIXTH_SENSE_OPENAPI_URL (server-side,
 * cached for an hour). Unset means the API reference isn't published yet.
 * SCENEID_OPENAPI_URL is still read as a fallback so environments configured
 * before the rebrand keep working.
 */
export async function loadApiSpec(
  url: string | undefined = process.env.SIXTH_SENSE_OPENAPI_URL || process.env.SCENEID_OPENAPI_URL,
): Promise<SpecResult> {
  "use cache";
  cacheLife("hours");

  if (!url) return { status: "unpublished" };
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { status: "error", message: `The API document returned HTTP ${response.status}.` };
    const document: unknown = await response.json();
    const problem = validateOpenApi(document);
    return problem ? { status: "error", message: problem } : { status: "ok", document: document as OpenApiDocument };
  } catch {
    return { status: "error", message: "The API document couldn't be loaded." };
  }
}
