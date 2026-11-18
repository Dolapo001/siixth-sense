"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalysisDataSource, UploadCancelledError, type AnalysisDataSource } from "./data/source";
import { ImageTooLargeError } from "./shrink-image";
import { analysisReducer, initialAnalysisState } from "./state";
import { isTerminal } from "./types";
import { validateScreenshot } from "./validation";

export function useAnalysisSource() {
  return useQuery({ queryKey: ["analysis", "source"], queryFn: getAnalysisDataSource, staleTime: Infinity });
}

/**
 * Drives one screenshot through select → upload → reported job status.
 * Polls the job until the service reports a terminal status.
 */
export function useScreenshotAnalysis(source: AnalysisDataSource) {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrl = "previewUrl" in state ? state.previewUrl : null;
  const jobId = state.phase === "submitted" ? state.jobId : null;

  // Revoke object URLs when they're replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Cancel an in-flight upload if the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const job = useQuery({
    queryKey: ["analysis", "job", jobId],
    enabled: !!jobId,
    queryFn: ({ signal }) => source.getJob(jobId!, signal),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isTerminal(status) ? false : source.pollIntervalMs;
    },
    // A job's state only moves forward; never show a cached result for a new job.
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (job.data) dispatch({ type: "job-update", job: job.data });
  }, [job.data]);

  const select = useCallback(
    (file: File) => {
      const error = validateScreenshot(file, source.constraints);
      if (error) dispatch({ type: "reject", error });
      else dispatch({ type: "select", file, previewUrl: URL.createObjectURL(file) });
    },
    [source.constraints],
  );

  const upload = useCallback(async () => {
    if (state.phase !== "selected" && state.phase !== "upload-failed") return;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "upload-start" });
    try {
      const { jobId } = await source.upload(state.file, {
        signal: controller.signal,
        onProgress: (progress) => dispatch({ type: "upload-progress", progress }),
      });
      dispatch({ type: "upload-success", jobId });
    } catch (error) {
      if (error instanceof UploadCancelledError) dispatch({ type: "upload-cancel" });
      else if (error instanceof ImageTooLargeError) dispatch({ type: "upload-error", error: error.message });
      else
        dispatch({ type: "upload-error", error: "The upload didn't complete. Check your connection and try again." });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [source, state]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  return {
    state,
    select,
    upload,
    cancel,
    reset,
    /** True when polling the job failed (network), as opposed to the job itself failing. */
    jobFetchFailed: job.isError,
    retryJobFetch: () => job.refetch(),
  };
}
