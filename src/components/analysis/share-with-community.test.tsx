import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisJob, Detection } from "@/features/image-analysis/types";
import { ShareWithCommunity, uncertaintyOf } from "./share-with-community";

const state = vi.hoisted(() => ({
  session: null as unknown,
  source: null as unknown,
}));
vi.mock("@/features/authentication/hooks", () => ({
  useSession: () => ({ isPending: false, data: state.session }),
}));
vi.mock("@/features/discoveries/hooks", () => ({
  useDiscoverySource: () => ({ isSuccess: true, data: state.source }),
}));

const detection = (confidence: number): Detection => ({
  id: "d1",
  label: "Two-door coupe",
  category: "vehicle",
  confidence,
  verification: "ai_suggested",
  box: null,
  evidence: [],
  relatedDiscoveries: [],
  relatedLocations: [],
});

const job = (detections: Detection[], withLocation = true): AnalysisJob => ({
  id: "job-1",
  status: "completed",
  submittedAt: "2026-11-18T10:00:00Z",
  detections,
  locationMatches: withLocation
    ? [{ locationId: "L1", name: "Vice Regal", precision: "approximate", confidence: 0.7 }]
    : [],
});

const renderShare = (j: AnalysisJob) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ShareWithCommunity job={j} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  state.session = { user: { username: "someone", displayName: "Someone" } };
  state.source = { submitDiscovery: vi.fn(async () => ({ id: "shared-1" })) };
});

describe("uncertaintyOf", () => {
  it("flags nothing found, low confidence and no location; stays quiet when confident", () => {
    expect(uncertaintyOf(job([]))).toMatch(/Nothing/);
    expect(uncertaintyOf(job([detection(0.3)]))).toMatch(/low-confidence/);
    expect(uncertaintyOf(job([detection(0.9)], false))).toMatch(/location/);
    expect(uncertaintyOf(job([detection(0.9)]))).toBeNull();
  });
});

describe("ShareWithCommunity", () => {
  it("asks the community when the scanner is unsure", () => {
    renderShare(job([detection(0.3)]));
    expect(screen.getByRole("heading", { name: "Not sure? Ask the community" })).toBeInTheDocument();
  });

  it("shares the screenshot, prefilled from the best guess, and links to the new discovery", async () => {
    renderShare(job([detection(0.9)]));
    await userEvent.click(screen.getByRole("button", { name: "Share with the community" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/Title/)).toHaveValue("Two-door coupe");
    await userEvent.click(within(dialog).getByRole("button", { name: "Share" }));
    const source = state.source as { submitDiscovery: ReturnType<typeof vi.fn> };
    expect(source.submitDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisJobId: "job-1",
        title: "Two-door coupe",
        category: "vehicle",
        location: expect.objectContaining({ id: "L1" }),
      }),
    );
    expect(await screen.findByRole("link", { name: "View your discovery" })).toHaveAttribute(
      "href",
      "/discoveries/shared-1",
    );
  });

  it("asks signed-out players to sign in", () => {
    state.session = null;
    renderShare(job([]));
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("says sharing needs the backend when there's no discovery service", () => {
    state.source = null;
    renderShare(job([]));
    expect(screen.getByText(/needs the Sixth Sense backend/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share with the community" })).not.toBeInTheDocument();
  });
});
