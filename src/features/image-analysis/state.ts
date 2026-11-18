import type { AnalysisJob } from "./types";

/*
 * Client-side flow for one screenshot. The browser owns idle → selected →
 * uploading → uploaded; after that the displayed status comes only from the
 * job the analysis service reports.
 */

export type AnalysisState =
  | { phase: "idle"; error: string | null }
  | { phase: "selected"; file: File; previewUrl: string }
  | { phase: "uploading"; file: File; previewUrl: string; progress: number }
  | { phase: "upload-failed"; file: File; previewUrl: string; error: string }
  | { phase: "submitted"; file: File; previewUrl: string; jobId: string; job: AnalysisJob | null };

export type AnalysisEvent =
  | { type: "select"; file: File; previewUrl: string }
  | { type: "reject"; error: string }
  | { type: "upload-start" }
  | { type: "upload-progress"; progress: number }
  | { type: "upload-success"; jobId: string }
  | { type: "upload-error"; error: string }
  | { type: "upload-cancel" }
  | { type: "job-update"; job: AnalysisJob }
  | { type: "reset" };

export const initialAnalysisState: AnalysisState = { phase: "idle", error: null };

export function analysisReducer(state: AnalysisState, event: AnalysisEvent): AnalysisState {
  switch (event.type) {
    case "select":
      // A new file can replace any state except an upload in flight.
      if (state.phase === "uploading") return state;
      return { phase: "selected", file: event.file, previewUrl: event.previewUrl };
    case "reject":
      if (state.phase === "uploading") return state;
      return { phase: "idle", error: event.error };
    case "upload-start":
      if (state.phase !== "selected" && state.phase !== "upload-failed") return state;
      return { phase: "uploading", file: state.file, previewUrl: state.previewUrl, progress: 0 };
    case "upload-progress":
      if (state.phase !== "uploading") return state;
      return { ...state, progress: Math.min(1, Math.max(state.progress, event.progress)) };
    case "upload-success":
      if (state.phase !== "uploading") return state;
      return { phase: "submitted", file: state.file, previewUrl: state.previewUrl, jobId: event.jobId, job: null };
    case "upload-error":
      if (state.phase !== "uploading") return state;
      return { phase: "upload-failed", file: state.file, previewUrl: state.previewUrl, error: event.error };
    case "upload-cancel":
      if (state.phase !== "uploading") return state;
      return { phase: "selected", file: state.file, previewUrl: state.previewUrl };
    case "job-update":
      // Ignore updates for a different job (e.g. a stale poll after reset).
      if (state.phase !== "submitted" || event.job.id !== state.jobId) return state;
      return { ...state, job: event.job };
    case "reset":
      return initialAnalysisState;
  }
}

/** The single status line the UI shows, derived from browser phase and reported job status. */
export type DisplayStatus =
  "idle" | "selected" | "uploading" | "upload-failed" | "uploaded" | "queued" | "processing" | "completed" | "failed";

export function displayStatus(state: AnalysisState): DisplayStatus {
  if (state.phase !== "submitted") return state.phase;
  return state.job?.status ?? "uploaded";
}
