import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockAnalysisSource, MOCK_TIMINGS } from "./data/mock-source";
import { UploadCancelledError } from "./data/source";
import { analysisReducer, displayStatus, initialAnalysisState, type AnalysisState } from "./state";
import type { AnalysisJob } from "./types";
import { describeTypes, formatBytes, validateScreenshot } from "./validation";

const constraints = { maxBytes: 1024, acceptedTypes: ["image/png", "image/jpeg", "image/webp"] };
const file = (name = "shot.png", type = "image/png", size = 10) => new File([new Uint8Array(size)], name, { type });
const job = (status: AnalysisJob["status"], id = "j1"): AnalysisJob => ({
  id,
  status,
  submittedAt: "2026-11-17T00:00:00Z",
  detections: [],
  locationMatches: [],
});

describe("validateScreenshot", () => {
  it("accepts a supported image within the size limit", () => {
    expect(validateScreenshot(file(), constraints)).toBeNull();
  });

  it("rejects videos and other types, naming what's supported", () => {
    expect(validateScreenshot(file("clip.mp4", "video/mp4"), constraints)).toBe(
      "Only PNG, JPEG or WebP images are supported. Videos aren't supported yet.",
    );
  });

  it("rejects oversized files", () => {
    expect(validateScreenshot(file("big.png", "image/png", 2048), constraints)).toBe(
      "Screenshots must be 1 KB or smaller.",
    );
  });

  it("rejects empty files", () => {
    expect(validateScreenshot(file("empty.png", "image/png", 0), constraints)).toBe("This file is empty.");
  });

  it("formats sizes and type lists", () => {
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
    expect(formatBytes(1536)).toBe("2 KB");
    expect(describeTypes(["image/png"])).toBe("PNG");
  });
});

describe("analysisReducer", () => {
  const f = file();
  const selected: AnalysisState = { phase: "selected", file: f, previewUrl: "blob:1" };

  it("walks the happy path, with status coming only from the reported job", () => {
    let s = analysisReducer(initialAnalysisState, { type: "select", file: f, previewUrl: "blob:1" });
    expect(displayStatus(s)).toBe("selected");
    s = analysisReducer(s, { type: "upload-start" });
    s = analysisReducer(s, { type: "upload-progress", progress: 0.5 });
    expect(s).toMatchObject({ phase: "uploading", progress: 0.5 });
    s = analysisReducer(s, { type: "upload-success", jobId: "j1" });
    expect(displayStatus(s)).toBe("uploaded");
    s = analysisReducer(s, { type: "job-update", job: job("queued") });
    expect(displayStatus(s)).toBe("queued");
    s = analysisReducer(s, { type: "job-update", job: job("processing") });
    expect(displayStatus(s)).toBe("processing");
    s = analysisReducer(s, { type: "job-update", job: job("completed") });
    expect(displayStatus(s)).toBe("completed");
  });

  it("never lets progress go backwards or past 100%", () => {
    let s = analysisReducer(selected, { type: "upload-start" });
    s = analysisReducer(s, { type: "upload-progress", progress: 0.6 });
    s = analysisReducer(s, { type: "upload-progress", progress: 0.4 });
    expect(s).toMatchObject({ progress: 0.6 });
    s = analysisReducer(s, { type: "upload-progress", progress: 3 });
    expect(s).toMatchObject({ progress: 1 });
  });

  it("returns to selected when an upload is cancelled", () => {
    const s = analysisReducer(analysisReducer(selected, { type: "upload-start" }), { type: "upload-cancel" });
    expect(s).toEqual(selected);
  });

  it("keeps the file after an upload error so it can be retried", () => {
    let s = analysisReducer(analysisReducer(selected, { type: "upload-start" }), {
      type: "upload-error",
      error: "Network",
    });
    expect(displayStatus(s)).toBe("upload-failed");
    s = analysisReducer(s, { type: "upload-start" });
    expect(s.phase).toBe("uploading");
  });

  it("ignores updates for a different job", () => {
    const submitted: AnalysisState = { ...selected, phase: "submitted", jobId: "j1", job: null };
    expect(analysisReducer(submitted, { type: "job-update", job: job("completed", "other") })).toBe(submitted);
  });

  it("won't replace the file mid-upload", () => {
    const uploading = analysisReducer(selected, { type: "upload-start" });
    expect(analysisReducer(uploading, { type: "select", file: file("b.png"), previewUrl: "blob:2" })).toBe(uploading);
  });

  it("shows a rejection on the idle screen", () => {
    expect(analysisReducer(initialAnalysisState, { type: "reject", error: "Too big" })).toEqual({
      phase: "idle",
      error: "Too big",
    });
  });
});

describe("mock analysis source", () => {
  let now = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
  });
  afterEach(() => vi.useRealTimers());

  const uploadNow = async (source: ReturnType<typeof createMockAnalysisSource>, name: string) => {
    const progress: number[] = [];
    const promise = source.upload(file(name), {
      signal: new AbortController().signal,
      onProgress: (p) => progress.push(p),
    });
    await vi.advanceTimersByTimeAsync(MOCK_TIMINGS.uploadMs);
    return { ...(await promise), progress };
  };

  it("reports upload progress, then queued → processing → completed over time", async () => {
    const source = createMockAnalysisSource(() => now);
    const { jobId, progress } = await uploadNow(source, "street.png");
    expect(progress.at(-1)).toBe(1);
    expect((await source.getJob(jobId)).status).toBe("queued");
    now = MOCK_TIMINGS.queuedMs;
    const processing = await source.getJob(jobId);
    expect(processing.status).toBe("processing");
    expect(processing.detections).toEqual([]);
    now = MOCK_TIMINGS.queuedMs + MOCK_TIMINGS.processingMs;
    const done = await source.getJob(jobId);
    expect(done.status).toBe("completed");
    expect(done.detections.length).toBeGreaterThan(0);
    expect(done.detections.every((d) => d.label.startsWith("Sample "))).toBe(true);
    expect(done.detections.every((d) => d.verification !== "verified")).toBe(true);
  });

  it("fails jobs for files named with 'fail'", async () => {
    const source = createMockAnalysisSource(() => now);
    const { jobId } = await uploadNow(source, "please-fail.png");
    now = 60_000;
    const result = await source.getJob(jobId);
    expect(result.status).toBe("failed");
    expect(result.error?.message).toBeTruthy();
  });

  it("cancels an upload when aborted", async () => {
    const source = createMockAnalysisSource(() => now);
    const controller = new AbortController();
    const promise = source.upload(file(), { signal: controller.signal, onProgress: () => {} });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(UploadCancelledError);
  });

  it("gives the same results for the same file name", async () => {
    const source = createMockAnalysisSource(() => now);
    const a = await uploadNow(source, "same.png");
    const b = await uploadNow(source, "same.png");
    now = 60_000;
    expect((await source.getJob(a.jobId)).detections).toEqual((await source.getJob(b.jobId)).detections);
  });
});
