import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { getLocationDetail } from "@/features/world/data/gtadb.server";
import type { Detection } from "@/features/image-analysis/types";
import { AnalysisProgress } from "./analysis-progress";
import { DetectionList } from "./detection-list";
import { LocationMatches } from "./location-matches";
import { ScreenshotStage } from "./screenshot-stage";
import { UploadDropzone } from "./upload-dropzone";

// Location lookups read the real GTA VI snapshot, without going through HTTP.
vi.mock("@/features/world/data/source", () => ({
  getWorldDataSource: async () => ({
    kind: "snapshot",
    getLocation: async (id: string) => getLocationDetail(id),
  }),
}));

const constraints = { maxBytes: 20 * 1024 * 1024, acceptedTypes: ["image/png", "image/jpeg", "image/webp"] };

const detection = (overrides: Partial<Detection> = {}): Detection => ({
  id: "d1",
  label: "Sample vehicle 1",
  category: "vehicle",
  confidence: 0.87,
  verification: "ai_suggested",
  box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  evidence: [],
  relatedDiscoveries: [],
  relatedLocations: [],
  ...overrides,
});

describe("UploadDropzone", () => {
  it("passes a chosen file on and states the limits", async () => {
    const onFile = vi.fn();
    render(<UploadDropzone constraints={constraints} onFile={onFile} />);
    expect(screen.getByText("PNG, JPEG or WebP, up to 20 MB")).toBeInTheDocument();
    const input = screen.getByLabelText("Choose a screenshot");
    const shot = new File(["x"], "shot.png", { type: "image/png" });
    await userEvent.upload(input, shot);
    expect(onFile).toHaveBeenCalledWith(shot);
  });

  it("accepts a dropped file", () => {
    const onFile = vi.fn();
    const { container } = render(<UploadDropzone constraints={constraints} onFile={onFile} />);
    const shot = new File(["x"], "drop.png", { type: "image/png" });
    fireEvent.drop(container.firstChild as Element, { dataTransfer: { files: [shot] } });
    expect(onFile).toHaveBeenCalledWith(shot);
  });

  it("announces a validation error and links it to the input", () => {
    render(<UploadDropzone constraints={constraints} onFile={vi.fn()} error="Too big" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Too big");
    expect(screen.getByLabelText("Choose a screenshot")).toHaveAccessibleDescription(/Too big/);
  });
});

describe("ScreenshotStage", () => {
  it("draws boxes in percentages of the image so they scale with it", () => {
    render(
      <ScreenshotStage
        src="blob:x"
        alt="shot"
        scanning={false}
        detections={[detection()]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    const box = screen.getByRole("button", { name: "Sample vehicle 1, high confidence, 87%" });
    expect(box).toHaveStyle({ left: "10%", top: "20%", width: "30%", height: "40%" });
  });

  it("doesn't draw detections that have no box", () => {
    render(
      <ScreenshotStage
        src="blob:x"
        alt="shot"
        scanning={false}
        detections={[detection(), detection({ id: "d2", label: "No box", box: null })]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("selects a detection and marks it pressed", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ScreenshotStage
        src="blob:x"
        alt="shot"
        scanning={false}
        detections={[detection()]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("d1");
    rerender(
      <ScreenshotStage
        src="blob:x"
        alt="shot"
        scanning={false}
        detections={[detection()]}
        selectedId="d1"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("DetectionList", () => {
  it("shows identity, confidence wording and AI-suggested status", () => {
    render(<DetectionList detections={[detection()]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Sample vehicle 1")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(screen.getByText("AI suggested")).toBeInTheDocument();
  });

  it("says when a detection has no position", () => {
    render(<DetectionList detections={[detection({ box: null })]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Position in screenshot not provided")).toBeInTheDocument();
  });

  it("links related locations to the map", () => {
    render(
      <DetectionList
        detections={[
          detection({ relatedLocations: [{ id: "sample-07", name: "Sample location", precision: "approximate" }] }),
        ]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Sample location" })).toHaveAttribute("href", "/world/sample-07");
  });
});

describe("LocationMatches", () => {
  it("says plainly when there's no match", () => {
    render(<LocationMatches matches={[]} />);
    expect(screen.getByText("No location match")).toBeInTheDocument();
  });

  const withQuery = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

  it("shows a match on the GTA map, with its areas and a link into the World Explorer", async () => {
    withQuery(
      <LocationMatches matches={[{ locationId: "L1", name: "Vice Regal", precision: "approximate", confidence: 0.4 }]} />,
    );
    expect(screen.getByRole("link", { name: "View on map" })).toHaveAttribute("href", "/world/L1");
    expect(screen.getByText("Low confidence")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Map around Vice Regal" })).toBeInTheDocument();
    expect(screen.getByText("Washington Beach · Vice Beach")).toBeInTheDocument();
  });

  it("says when the matched place isn't on the World map", async () => {
    withQuery(
      <LocationMatches matches={[{ locationId: "nope", name: "Somewhere", precision: "region", confidence: 0.4 }]} />,
    );
    expect(await screen.findByText(/isn't on the World map yet/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Map around/ })).not.toBeInTheDocument();
  });

  it("numbers candidates when there are several", () => {
    withQuery(
      <LocationMatches
        matches={[
          { locationId: "L1", name: "Vice Regal", precision: "approximate", confidence: 0.7 },
          { locationId: "L36", name: "Ocean View Hotel", precision: "approximate", confidence: 0.4 },
        ]}
      />,
    );
    expect(screen.getByText("Candidate 1")).toBeInTheDocument();
    expect(screen.getByText("Candidate 2")).toBeInTheDocument();
  });
});

describe("AnalysisProgress", () => {
  it("announces the current status", () => {
    render(<AnalysisProgress status="processing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Analysing screenshot.");
    const current = screen.getAllByRole("listitem").find((li) => li.getAttribute("aria-current") === "step")!;
    expect(within(current).getByText(/Analysing/)).toBeInTheDocument();
  });

  it("shows upload percentage", () => {
    render(<AnalysisProgress status="uploading" uploadProgress={0.42} />);
    expect(screen.getByRole("progressbar", { name: "Upload progress" })).toHaveAttribute("value", "42");
  });

  it("marks the failing step", () => {
    render(<AnalysisProgress status="failed" />);
    expect(screen.getByText(/\(failed\)/)).toBeInTheDocument();
  });
});
