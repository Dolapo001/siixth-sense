/*
 * Screenshot analysis from the Sixth Sense backend: upload to images/upload/,
 * then poll analyses/{id}/. Shapes: the backend's
 * docs/frontend-requirements-response.md (items 6–8) and section 4 of its
 * frontend-integration.md.
 */

import { api, ApiError, apiUrl, readEnvelope } from "@/lib/api/client";
import { fromBackendCategory, toConfidenceLevel, toPrecision } from "@/lib/api/mappers";
import { getWorldDataSource } from "@/features/world/data/source";
import { placesFromAnalysis } from "../place-matching";
import type { AnalysisJob, Detection, JobStatus, LocationMatch } from "../types";
import { UploadCancelledError, type AnalysisDataSource } from "./source";

type BackendDetection = {
  public_id: string;
  category: string;
  label: string;
  description: string;
  evidence: string;
  confidence: number | null;
  band: string | null;
  bbox: [number, number, number, number] | null;
  catalogue_name: string | null; // "" when nothing in the catalogue matched
  related_discoveries: { public_id: string; title: string }[];
  related_locations: { public_id: string; name: string; precision: string }[];
};

type BackendAnalysis = {
  public_id: string;
  status: string;
  error: string | null;
  created_at: string;
  scene_context: { candidate_location: string | null; location_certainty?: string; visible_text?: string[] } | null;
  location_matches: {
    public_id: string;
    kind: "location" | "region";
    name: string;
    precision: string;
    confidence: number | null;
    /** How the model placed it; absent on older results. */
    certainty?: "confirmed" | "likely" | null;
  }[];
  entities: BackendDetection[];
};

/** completed_partial still has results; cancelled is as final as failed. */
function toJobStatus(status: string): JobStatus {
  if (status === "completed" || status === "completed_partial") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  if (status === "processing") return "processing";
  return "queued";
}

function toDetection(e: BackendDetection): Detection {
  const [x, y, width, height] = e.bbox ?? [];
  return {
    id: e.public_id,
    // The catalogue name is set only when the server confirmed an exact catalogue match.
    label: e.catalogue_name || e.label,
    category: fromBackendCategory(e.category),
    confidence: e.confidence ?? undefined,
    confidenceLevel: toConfidenceLevel(e.band),
    description: e.description || undefined,
    verification: "ai_suggested",
    box: e.bbox ? { x: x!, y: y!, width: width!, height: height! } : null,
    evidence: e.evidence ? [e.evidence] : [],
    relatedDiscoveries: e.related_discoveries.map((d) => ({ id: d.public_id, title: d.title })),
    relatedLocations: e.related_locations.map((l) => ({
      id: `location:${l.public_id}`,
      name: l.name,
      precision: toPrecision(l.precision),
    })),
  };
}

/** Named World map places the analysis points to (see placesFromAnalysis). The map is optional here. */
async function worldPlacesFor(scene: BackendAnalysis["scene_context"], detections: Detection[]): Promise<LocationMatch[]> {
  if (!scene?.candidate_location && !scene?.visible_text?.length && detections.length === 0) return [];
  try {
    const world = await getWorldDataSource();
    const markers = (await world?.listMarkers()) ?? [];
    return placesFromAnalysis(markers, {
      candidateLocation: scene?.candidate_location,
      visibleText: scene?.visible_text,
      detections,
    });
  } catch {
    return [];
  }
}

const certaintyBasis = { confirmed: "Named on screen", likely: "Likely, from the scenery" } as const;

/** Backend places keep a "location:" / "region:" prefix so sharing knows which field to send. */
const toBackendMatch = (m: BackendAnalysis["location_matches"][number]): LocationMatch => ({
  locationId: `${m.kind}:${m.public_id}`,
  name: m.name,
  precision: toPrecision(m.precision),
  confidence: m.confidence ?? undefined,
  basis: m.certainty ? certaintyBasis[m.certainty] : undefined,
});

/**
 * The analysis to follow for an uploaded image. Re-uploading identical bytes
 * returns the existing image with its latest analysis: reuse it while it is
 * running or once it has results (no paying twice for the same answer), but
 * start a fresh one if it failed or was cancelled — otherwise a screenshot
 * whose analysis once failed could never be analysed again.
 */
async function analysisFor(image: { public_id: string; latest_analysis: string | null }): Promise<string> {
  if (image.latest_analysis) {
    const latest = await api<{ status: string }>(`analyses/${encodeURIComponent(image.latest_analysis)}/`);
    if (toJobStatus(latest.status) !== "failed") return image.latest_analysis;
  }
  return (await api<{ public_id: string }>("analyses/", { method: "POST", body: { image: image.public_id } })).public_id;
}

function uploadMessage(error: ApiError) {
  if (error.status === 401) return "Sign in to analyse screenshots.";
  return error.message;
}

export async function createApiAnalysisSource(): Promise<AnalysisDataSource> {
  const limits = await api<{ maxBytes: number; acceptedTypes: string[]; pollIntervalMs: number }>("analyses/constraints/");

  return {
    kind: "live",
    constraints: { maxBytes: limits.maxBytes, acceptedTypes: limits.acceptedTypes },
    pollIntervalMs: limits.pollIntervalMs,

    upload(file, { onProgress, signal }) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new UploadCancelledError());
        // XMLHttpRequest, not fetch: fetch can't report upload progress.
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl("images/upload/"));
        xhr.responseType = "text";
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress(event.loaded / event.total);
        };
        xhr.onerror = () => reject(new Error("The upload didn't go through. Check your connection and try again."));
        xhr.onabort = () => reject(new UploadCancelledError());
        xhr.onload = async () => {
          try {
            const response = new Response(xhr.status === 204 ? null : xhr.responseText, {
              status: xhr.status,
              headers: { "Content-Type": "application/json" },
            });
            const image = await readEnvelope<{ public_id: string; latest_analysis: string | null }>(response);
            const jobId = await analysisFor(image);
            onProgress(1);
            resolve({ jobId });
          } catch (error) {
            reject(error instanceof ApiError ? new Error(uploadMessage(error)) : error);
          }
        };
        signal.addEventListener("abort", () => xhr.abort());
        const form = new FormData();
        form.append("image", file);
        xhr.send(form);
      });
    },

    async getJob(jobId, signal) {
      const job = await api<BackendAnalysis>(`analyses/${encodeURIComponent(jobId)}/`, { signal });
      const status = toJobStatus(job.status);
      const result: AnalysisJob = {
        id: job.public_id,
        status,
        submittedAt: job.created_at,
        detections: [],
        locationMatches: [],
      };
      if (status === "failed") {
        result.error = {
          code: job.status === "cancelled" ? "cancelled" : "analysis_failed",
          message: job.error || "The analysis didn't finish. Try again.",
        };
      }
      if (status === "completed") {
        result.detections = job.entities.map(toDetection);
        const places = await worldPlacesFor(job.scene_context, result.detections);
        result.locationMatches = [...job.location_matches.map(toBackendMatch), ...places];
      }
      return result;
    },
  };
}
