import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadCancelledError, type AnalysisDataSource } from "./data/source";
import type { AnalysisJob } from "./types";

/*
 * Failure and edge paths of the Analyze flow, against a fake service we control.
 */

let reported: AnalysisJob["status"] = "queued";
let withDetections = true;
let jobFails = false;
let uploadHangs = false;
let pollMs = 20;

const fakeSource: AnalysisDataSource = {
  kind: "sample",
  constraints: { maxBytes: 1024 * 1024, acceptedTypes: ["image/png"] },
  get pollIntervalMs() {
    return pollMs;
  },
  async upload(_file, { onProgress, signal }) {
    onProgress(0.3);
    if (uploadHangs) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new UploadCancelledError()));
      });
    }
    return { jobId: "job-1" };
  },
  async getJob(jobId) {
    if (jobFails) throw new Error("network");
    const base = { id: jobId, submittedAt: "2026-11-17T00:00:00Z", detections: [], locationMatches: [] };
    if (reported !== "completed" || !withDetections) return { ...base, status: reported };
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

beforeEach(() => {
  reported = "queued";
  withDetections = true;
  jobFails = false;
  uploadHangs = false;
  pollMs = 20;
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AnalyzeExperience />
    </QueryClientProvider>,
  );
}

const choose = async (file = new File(["x"], "shot.png", { type: "image/png" })) =>
  userEvent.upload(await screen.findByLabelText("Choose a screenshot"), file);

describe("Analyze flow failures", () => {
  it("says when it loses contact with the service, and retrying resumes polling to a result", async () => {
    jobFails = true;
    // Slow polling while failing, so only the retry can recover.
    pollMs = 60_000;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));

    expect(await screen.findByText("Lost contact with the analysis service")).toBeInTheDocument();
    expect(screen.queryByText("Sample vehicle 1")).not.toBeInTheDocument();

    jobFails = false;
    reported = "processing";
    pollMs = 20;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Analysing screenshot.")).toBeInTheDocument();
    expect(screen.queryByText("Lost contact with the analysis service")).not.toBeInTheDocument();

    // Polling picks up from here without another retry.
    reported = "completed";
    expect(await screen.findByText("Analysis complete.")).toBeInTheDocument();
    expect(screen.getAllByText("Sample vehicle 1").length).toBeGreaterThan(0);
  });

  it("cancelling an upload goes back to the selected file", async () => {
    uploadHangs = true;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel upload" }));

    expect(await screen.findByRole("button", { name: "Analyze screenshot" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel upload" })).not.toBeInTheDocument();
    expect(screen.getByText("shot.png")).toBeInTheDocument();
    expect(screen.queryByText(/Submitted · job/)).not.toBeInTheDocument();
  });

  it("shows an empty state when the completed job identified nothing", async () => {
    reported = "completed";
    withDetections = false;
    renderPage();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshot" }));

    expect(await screen.findByText("Nothing identified")).toBeInTheDocument();
    expect(screen.getByText("The service didn't recognise anything in this screenshot.")).toBeInTheDocument();
    expect(screen.getByText(/Detected · 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze another screenshot" })).toBeInTheDocument();
  });

  it("rejects an oversized file with a visible error", async () => {
    renderPage();
    await choose(new File([new Uint8Array(1024 * 1024 + 1)], "big.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Screenshots must be 1 MB or smaller.");
    expect(screen.queryByRole("button", { name: "Analyze screenshot" })).not.toBeInTheDocument();
  });

  it("rejects an empty file with a visible error", async () => {
    renderPage();
    await choose(new File([], "empty.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This file is empty.");
    expect(screen.queryByRole("button", { name: "Analyze screenshot" })).not.toBeInTheDocument();
  });
});
