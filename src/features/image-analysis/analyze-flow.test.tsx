import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AnalysisDataSource } from "./data/source";
import { NOT_GTA, type AnalysisJob } from "./types";

/*
 * End-to-end flow against a fake service we control: the page must show
 * exactly what the service reports, and results only once it says "completed".
 */

let reported: AnalysisJob["status"] = "queued";
let uploadFails = false;
let reportedError: AnalysisJob["error"];

const fakeSource: AnalysisDataSource = {
  kind: "sample",
  constraints: { maxBytes: 1024 * 1024, acceptedTypes: ["image/png"] },
  pollIntervalMs: 20,
  async upload(_file, { onProgress }) {
    onProgress(1);
    if (uploadFails) throw new Error("network");
    return { jobId: "job-1" };
  },
  async getJob(jobId) {
    const base = { id: jobId, submittedAt: "2026-11-17T00:00:00Z", detections: [], locationMatches: [] };
    if (reported !== "completed") return { ...base, status: reported, error: reportedError };
    return {
      ...base,
      status: "completed",
      detections: [
        {
          id: "d1",
          label: "Sample vehicle 1",
          category: "vehicle",
          confidence: 0.9,
          verification: "ai_suggested",
          box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
          evidence: [],
          relatedDiscoveries: [],
          relatedLocations: [],
        },
      ],
      locationMatches: [],
    };
  },
};

vi.mock("./data/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./data/source")>()),
  getAnalysisDataSource: async () => fakeSource,
}));

const { AnalyzeExperience } = await import("./analyze-experience");

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterAll(() => vi.restoreAllMocks());

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AnalyzeExperience />
    </QueryClientProvider>,
  );
}

const choose = async () =>
  userEvent.upload(
    await screen.findByLabelText("Choose a screenshot"),
    new File(["x"], "shot.png", { type: "image/png" }),
  );

describe("Analyze flow", () => {
  it("shows only reported states, and results only after completion", async () => {
    reported = "queued";
    uploadFails = false;
    renderPage();
    expect(await screen.findByText("Sample data · nothing is uploaded")).toBeInTheDocument();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));

    expect(await screen.findByText("Submitted · job job-1")).toBeInTheDocument();
    expect(await screen.findByText("Queued for analysis.")).toBeInTheDocument();
    expect(screen.queryByText("Sample vehicle 1")).not.toBeInTheDocument();

    reported = "processing";
    expect(await screen.findByText("Analysing screenshot.")).toBeInTheDocument();
    expect(screen.queryByText("Sample vehicle 1")).not.toBeInTheDocument();

    reported = "completed";
    expect(await screen.findByText("Analysis complete.")).toBeInTheDocument();
    expect(screen.getAllByText("Sample vehicle 1").length).toBeGreaterThan(0);
    expect(screen.getByText("No location match")).toBeInTheDocument();
  });

  it("shows a failed job as failed", async () => {
    reported = "failed";
    uploadFails = false;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));
    expect(await screen.findByRole("heading", { name: "Analysis failed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze another screenshot" })).toBeInTheDocument();
  });

  it("says so when the screenshot isn't from GTA VI", async () => {
    reported = "failed";
    reportedError = { code: NOT_GTA, message: "This doesn't look like a GTA VI screenshot. It's a photo of a cat." };
    uploadFails = false;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));
    expect(await screen.findByRole("heading", { name: "Not a GTA VI screenshot" })).toBeInTheDocument();
    expect(screen.getByText(/photo of a cat/)).toBeInTheDocument();
    reportedError = undefined;
  });

  it("offers a retry when the upload itself fails", async () => {
    uploadFails = true;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));
    expect(await screen.findByRole("heading", { name: "Upload failed" })).toBeInTheDocument();
    uploadFails = false;
    reported = "queued";
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Submitted · job job-1")).toBeInTheDocument();
  });

  it("rejects an unsupported file before uploading", async () => {
    renderPage();
    await userEvent.upload(
      await screen.findByLabelText("Choose a screenshot"),
      new File(["x"], "clip.mp4", { type: "video/mp4" }),
      { applyAccept: false },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Videos aren't supported yet.");
  });
});
