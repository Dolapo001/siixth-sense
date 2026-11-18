import { liveApiEnabled } from "@/lib/api/config";
import { devMocksEnabled } from "@/lib/api/dev-mocks";
import type { UploadConstraints } from "../validation";
import type { AnalysisJob } from "../types";

export type UploadOptions = {
  /** 0–1. The API source should use XMLHttpRequest, since fetch can't report upload progress. */
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
};

/**
 * Everything the Analyze page needs from the analysis service.
 * Dev mock now; Sixth Sense API in Phase 5. The UI never decides a job's status,
 * it only shows what `getJob` reports.
 */
export interface AnalysisDataSource {
  readonly kind: "sample" | "live";
  readonly constraints: UploadConstraints;
  /** How often to poll a job that isn't finished. Replace with push if the backend supports it. */
  readonly pollIntervalMs: number;
  upload(file: File, options: UploadOptions): Promise<{ jobId: string }>;
  getJob(jobId: string, signal?: AbortSignal): Promise<AnalysisJob>;
}

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadCancelledError";
  }
}

export async function getAnalysisDataSource(): Promise<AnalysisDataSource | null> {
  if (liveApiEnabled()) {
    const { createApiAnalysisSource } = await import("./api-source");
    return createApiAnalysisSource();
  }
  if (devMocksEnabled()) {
    const { createMockAnalysisSource } = await import("./mock-source");
    return createMockAnalysisSource();
  }
  return null;
}
