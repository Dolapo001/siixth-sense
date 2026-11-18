/*
 * ⚠ DEVELOPMENT SAMPLE DATA — NOT REAL ANALYSIS.
 *
 * Simulates an analysis service so the Analyze page can be built before the
 * backend exists. The file never leaves the browser. Results are generic,
 * deterministic per file name, and always labelled "Sample data" in the UI.
 *
 * Name a file with "fail" in it to get a failed job.
 */

import { getSampleWorld } from "@/features/world/data/mock-source";
import { discoveryCategories } from "@/features/world/types";
import type { VerificationStatus } from "@/types/intelligence";
import type { AnalysisJob, Detection, LocationMatch } from "../types";
import { UploadCancelledError, type AnalysisDataSource } from "./source";

export const MOCK_TIMINGS = { uploadMs: 1_200, queuedMs: 1_500, processingMs: 3_000 } as const;

const jobs = new Map<string, { submittedAt: number; fileName: string }>();
let counter = 0;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every discovery in the sample world, so "related discovery" links resolve in development. */
const sampleDiscoveries = [...getSampleWorld().locations.values()].flatMap((location) => location.discoveries);

/**
 * Real places from the GTA VI community map (gtadb ids), so "View on map" and
 * the result maps open something real in development. Which place a sample
 * result "matches" is still random: the match itself is sample data.
 */
const samplePlaces = [
  { id: "L1", name: "Vice Regal" },
  { id: "L36", name: "Ocean View Hotel" },
  { id: "L221", name: "Heath Tower" },
  { id: "L163", name: "Evergreen Mall" },
  { id: "L456", name: "Vice City Sign" },
  { id: "L317", name: "Bocamar Bridge" },
  { id: "L326", name: "Brian's Boat Works & Marina" },
  { id: "L530", name: "Mount Kalaga" },
];
const samplePlace = (n: number) => samplePlaces[n % samplePlaces.length];

function buildResults(fileName: string): Pick<AnalysisJob, "detections" | "locationMatches"> {
  const random = mulberry32(hash(fileName));
  const count = 1 + Math.floor(random() * 4);
  const verifications: VerificationStatus[] = ["ai_suggested", "ai_suggested", "awaiting_verification"];

  const detections: Detection[] = Array.from({ length: count }, (_, i) => {
    const category = discoveryCategories[Math.floor(random() * discoveryCategories.length)];
    // Roughly one in four detections comes back without a position, to exercise that path.
    const hasBox = random() > 0.25;
    const width = 0.15 + random() * 0.3;
    const height = 0.15 + random() * 0.3;
    const box = hasBox ? { x: random() * (1 - width), y: random() * (1 - height), width, height } : null;
    return {
      id: `det-${i + 1}`,
      label: `Sample ${category} ${i + 1}`,
      category,
      confidence: Math.round((0.3 + random() * 0.69) * 100) / 100,
      description: "Placeholder result for development. Not a real identification.",
      verification: verifications[Math.floor(random() * verifications.length)],
      box,
      evidence: hasBox ? ["Sample evidence: visual features matched a reference image."] : [],
      relatedDiscoveries:
        random() > 0.5
          ? [sampleDiscoveries[Math.floor(random() * sampleDiscoveries.length)]].map(({ id, title }) => ({ id, title }))
          : [],
      relatedLocations:
        random() > 0.4
          ? [
              {
                ...samplePlace(Math.floor(random() * 64)),
                precision: "approximate" as const,
              },
            ]
          : [],
    };
  });

  // About a third of sample results have no location match, as real ones often won't.
  // Sometimes two candidates, as a real service may return several.
  const matchCount = random() > 0.33 ? (random() > 0.6 ? 2 : 1) : 0;
  const first = Math.floor(random() * 64);
  const locationMatches: LocationMatch[] = Array.from({ length: matchCount }, (_, i) => {
    const place = samplePlace(first + i * 3);
    return {
      locationId: place.id,
      name: place.name,
      precision: "approximate" as const,
      confidence: Math.round((0.75 - i * 0.25 - random() * 0.2) * 100) / 100,
    };
  });

  return { detections, locationMatches };
}

export function createMockAnalysisSource(now: () => number = Date.now): AnalysisDataSource {
  return {
    kind: "sample",
    constraints: { maxBytes: 20 * 1024 * 1024, acceptedTypes: ["image/png", "image/jpeg", "image/webp"] },
    pollIntervalMs: 1_000,

    upload(file, { onProgress, signal }) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new UploadCancelledError());
        const steps = 10;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          onProgress(step / steps);
          if (step >= steps) {
            clearInterval(timer);
            const jobId = `sample-job-${++counter}-${hash(file.name).toString(36)}`;
            jobs.set(jobId, { submittedAt: now(), fileName: file.name });
            resolve({ jobId });
          }
        }, MOCK_TIMINGS.uploadMs / steps);
        signal.addEventListener("abort", () => {
          clearInterval(timer);
          reject(new UploadCancelledError());
        });
      });
    },

    async getJob(jobId) {
      const record = jobs.get(jobId);
      if (!record) throw new Error(`Unknown job ${jobId}`);
      const elapsed = now() - record.submittedAt;
      const base = {
        id: jobId,
        submittedAt: new Date(record.submittedAt).toISOString(),
        detections: [],
        locationMatches: [],
      };

      if (elapsed < MOCK_TIMINGS.queuedMs) return { ...base, status: "queued" };
      if (elapsed < MOCK_TIMINGS.queuedMs + MOCK_TIMINGS.processingMs) return { ...base, status: "processing" };

      const completedAt = new Date(
        record.submittedAt + MOCK_TIMINGS.queuedMs + MOCK_TIMINGS.processingMs,
      ).toISOString();
      if (/fail/i.test(record.fileName)) {
        return {
          ...base,
          status: "failed",
          completedAt,
          error: { code: "sample_failure", message: "The sample service was asked to fail for this file." },
        };
      }
      return { ...base, status: "completed", completedAt, ...buildResults(record.fileName) };
    },
  };
}
