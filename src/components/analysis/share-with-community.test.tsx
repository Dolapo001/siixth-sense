import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisJob, Detection } from "@/features/image-analysis/types";
import type { WorldMarker } from "@/features/world/types";
import { ShareWithCommunity, uncertaintyOf } from "./share-with-community";

const state = vi.hoisted(() => ({
  session: null as unknown,
  source: null as unknown,
  markers: [] as WorldMarker[],
}));
vi.mock("@/features/authentication/hooks", () => ({
  useSession: () => ({ isPending: false, data: state.session }),
}));
vi.mock("@/features/discoveries/hooks", () => ({
  useDiscoverySource: () => ({ isSuccess: true, data: state.source }),
}));
vi.mock("@/features/world/hooks", () => ({
  useWorldOverview: () => ({ data: { markers: state.markers } }),
}));

const mapPlace = (locationId: string, title: string, areas: string[], extra: Partial<WorldMarker> = {}): WorldMarker => ({
  id: `m-${locationId}`,
  locationId,
  title,
  category: "location",
  precision: "approximate",
  coordinate: { x: 1, y: 1 },
  regionId: null,
  verification: "ai_suggested",
  areas,
  ...extra,
});

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
  state.markers = [];
});

describe("uncertaintyOf", () => {
  it("flags nothing found, low confidence and no location; stays quiet when confident", () => {
    expect(uncertaintyOf(job([]))).toMatch(/Nothing/);
    expect(uncertaintyOf(job([detection(0.3)]))).toMatch(/low-confidence/);
    expect(uncertaintyOf(job([detection(0.9)], false))).toMatch(/location/);
    expect(uncertaintyOf(job([detection(0.9)]))).toBeNull();
    const areaOnly = { ...job([detection(0.9)], false), locationMatches: [{ locationId: "region:ob", name: "Ocean Beach", precision: "region" as const }] };
    expect(uncertaintyOf(areaOnly)).toMatch(/likely area/);
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

  it("lists every named World map place, searchable, and shares the one picked", async () => {
    state.markers = [
      mapPlace("L1", "Vice Regal", ["Washington Beach"]),
      mapPlace("L39", "Seven Seas Seafood", ["Shore Dr", "Ocean Beach", "Vice Beach"]),
      mapPlace("L50", "Boardwalk", ["Shore Dr", "Ocean Beach"]),
      mapPlace("L60", "Unnamed pier", ["Vice Beach"], { nameKnown: false }),
    ];
    renderShare(job([detection(0.9)], false));
    await userEvent.click(screen.getByRole("button", { name: "Share with the community" }));
    const dialog = screen.getByRole("dialog");
    const where = within(dialog).getByLabelText(/Where is it/);
    const options = () => within(where).getAllByRole("option").map((o) => o.textContent);
    expect(options()).toEqual([
      "Not sure",
      "Boardwalk — Shore Dr, Ocean Beach",
      "Seven Seas Seafood — Shore Dr, Ocean Beach",
      "Vice Regal — Washington Beach",
    ]);
    await userEvent.type(within(dialog).getByLabelText(/Find a place/), "seven");
    expect(options()).toEqual(["Not sure", "Seven Seas Seafood — Shore Dr, Ocean Beach"]);
    await userEvent.selectOptions(where, "L39");
    await userEvent.click(within(dialog).getByRole("button", { name: "Share" }));
    const source = state.source as { submitDiscovery: ReturnType<typeof vi.fn> };
    expect(source.submitDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { id: "L39", name: "Seven Seas Seafood", areas: ["Shore Dr", "Ocean Beach", "Vice Beach"] },
      }),
    );
  });

  it("keeps the analysis suggestions first and doesn't list them twice", async () => {
    state.markers = [mapPlace("L1", "Vice Regal", ["Washington Beach"]), mapPlace("L2", "Boardwalk", [])];
    renderShare(job([detection(0.9)]));
    await userEvent.click(screen.getByRole("button", { name: "Share with the community" }));
    const where = within(screen.getByRole("dialog")).getByLabelText(/Where is it/);
    expect(within(where).getByRole("group", { name: "Suggested by the analysis" })).toHaveTextContent("Vice Regal");
    expect(within(where).getByRole("group", { name: "Places on the World map" })).not.toHaveTextContent("Vice Regal");
    expect(where).toHaveValue("L1");
  });

  it("lists places, not the discoveries pinned at them", async () => {
    // A discovery tagged place:L1 is a marker reusing L1 (so it opens the place); it isn't a place to pick.
    state.markers = [
      mapPlace("L1", "Vice Regal", ["Washington Beach"]),
      mapPlace("L1", "Blue test frame", ["Washington Beach"], { id: "discovery:d1", layer: "discoveries" }),
    ];
    renderShare(job([detection(0.9)], false));
    await userEvent.click(screen.getByRole("button", { name: "Share with the community" }));
    const where = within(screen.getByRole("dialog")).getByLabelText(/Where is it/);
    expect(within(where).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Not sure",
      "Vice Regal — Washington Beach",
    ]);
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
