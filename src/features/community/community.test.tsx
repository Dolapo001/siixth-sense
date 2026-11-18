import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VotePanel } from "@/components/community/vote-panel";
import { __sample, createMockDiscoverySource } from "@/features/discoveries/data/mock-source";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import type { ViewerPermissions } from "@/features/discoveries/types";
import { commentSchema, disputeSchema, evidenceSchema, reportSchema, suggestionSchema } from "./schemas";

// These tests run against the sample source, which is opt-in outside `next dev`.
vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

// Signed-in state is switchable per test.
let signedIn = true;
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () =>
    signedIn ? { user: { username: "sample_viewer", displayName: "You (sample viewer)" } } : null,
}));

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/community",
  useSearchParams: () => new URLSearchParams(search),
}));

const { DiscoveryDetailView } = await import("@/features/discoveries/discovery-detail");
const { CommunityHub, queueFromParam } = await import("./community-hub");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const byStatus = (status: string) =>
  __sample.items.find((item) => item.verification === status && item.contributor.username !== "sample_viewer")!;

beforeEach(() => {
  signedIn = true;
  search = "";
});

describe("community schemas", () => {
  it("validates comments, suggestions, evidence, disputes and reports", () => {
    expect(commentSchema.safeParse({ body: " " }).success).toBe(false);
    expect(commentSchema.safeParse({ body: "Looks right" }).success).toBe(true);
    expect(suggestionSchema.safeParse({ label: "Sample car", category: "spaceship" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ label: "Sample car", category: "vehicle" }).success).toBe(true);
    expect(evidenceSchema.safeParse({ text: "Matches the reference", url: "javascript:alert(1)" }).success).toBe(false);
    expect(evidenceSchema.safeParse({ text: "Matches the reference", url: "" }).success).toBe(true);
    expect(evidenceSchema.safeParse({ text: "Matches the reference", url: "https://example.test/x" }).success).toBe(
      true,
    );
    expect(disputeSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "made-up" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "spam" }).success).toBe(true);
  });
});

describe("mock community actions", () => {
  it("adds a comment by the viewer and counts it", async () => {
    const source = createMockDiscoverySource();
    const item = byStatus("verified");
    const before = item.engagement.comments;
    const comment = await source.addComment(item.id, "Sample test comment");
    expect(comment.author.username).toBe("sample_viewer");
    const detail = await source.getDiscovery(item.id);
    expect(detail!.comments.at(-1)!.body).toBe("Sample test comment");
    expect(detail!.engagement.comments).toBe(before + 1);
  });

  it("moves an AI suggestion to review on the first confirmation, recording who did it", async () => {
    const source = createMockDiscoverySource();
    // Few enough confirmations that one more won't reach the sample rule's "verified" threshold.
    const item = __sample.items.find((i) => i.verification === "ai_suggested" && i.engagement.confirmations < 9)!;
    const detail = await source.vote(item.id, "confirm");
    expect(detail.verification).toBe("awaiting_verification");
    expect(detail.verificationHistory.at(-1)).toMatchObject({ actor: { kind: "member", username: "sample_viewer" } });
    expect(detail.viewer!.vote.current).toBe("confirm");
  });

  it("requires a reason to dispute, then marks the discovery disputed", async () => {
    const source = createMockDiscoverySource();
    const item = byStatus("awaiting_verification");
    await expect(source.vote(item.id, "dispute")).rejects.toBeInstanceOf(ActionRefusedError);
    const detail = await source.vote(item.id, "dispute", "The wheels don't match.");
    expect(detail.verification).toBe("disputed");
    expect(detail.verificationHistory.at(-1)!.note).toBe("The wheels don't match.");
  });

  it("won't let the viewer verify their own discovery", async () => {
    const source = createMockDiscoverySource();
    const own = __sample.items.find((item) => item.contributor.username === "sample_viewer")!;
    const detail = await source.getDiscovery(own.id);
    expect(detail!.viewer!.vote).toMatchObject({ allowed: false, reason: "You can't verify your own discovery." });
    expect(detail!.viewer!.canReport).toBe(false);
  });

  it("refuses votes on rejected discoveries with a reason", async () => {
    const source = createMockDiscoverySource();
    const item = byStatus("rejected");
    const detail = await source.getDiscovery(item.id);
    expect(detail!.viewer!.vote).toMatchObject({
      allowed: false,
      reason: "Rejected discoveries are closed to new votes.",
    });
    await expect(source.vote(item.id, "confirm")).rejects.toThrow("Rejected discoveries are closed to new votes.");
  });

  it("records reports and toggles following", async () => {
    const source = createMockDiscoverySource();
    const item = byStatus("verified");
    const { reportId } = await source.report({ kind: "discovery", id: item.id }, "spam");
    expect(__sample.reports.some((r) => r.id === reportId)).toBe(true);
    await source.setFollowing(item.contributor.username, true);
    expect((await source.getDiscovery(item.id))!.viewer!.followingContributor).toBe(true);
  });

  it("refuses every action when signed out, and offers no permissions", async () => {
    signedIn = false;
    const source = createMockDiscoverySource();
    const item = byStatus("verified");
    expect((await source.getDiscovery(item.id))!.viewer).toBeNull();
    await expect(source.addComment(item.id, "Hello there")).rejects.toThrow("Sign in to do that.");
  });
});

describe("VotePanel", () => {
  const viewer = (vote: Partial<ViewerPermissions["vote"]> = {}): ViewerPermissions => ({
    canComment: true,
    canSuggest: true,
    canAddEvidence: true,
    canReport: true,
    vote: { allowed: true, current: null, ...vote },
  });

  it("asks signed-out users to sign in instead of showing dead buttons", () => {
    render(<VotePanel viewer={null} onVote={vi.fn()} pending={false} error={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains why voting isn't allowed", () => {
    render(
      <VotePanel
        viewer={viewer({ allowed: false, reason: "You can't verify your own discovery." })}
        onVote={vi.fn()}
        pending={false}
        error={null}
      />,
    );
    expect(screen.getByText("You can't verify your own discovery.")).toBeInTheDocument();
  });

  it("won't send a dispute without a reason", async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(<VotePanel viewer={viewer()} onVote={onVote} pending={false} error={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Dispute" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Say why");
    expect(onVote).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Why are you disputing it/), "Different headlights.");
    await userEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    expect(onVote).toHaveBeenCalledWith("dispute", "Different headlights.");
  });

  it("keeps the dispute open and shows the server's reason when it fails", async () => {
    const onVote = vi.fn().mockRejectedValue(new ActionRefusedError("Closed."));
    const { rerender } = render(<VotePanel viewer={viewer()} onVote={onVote} pending={false} error={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Dispute" }));
    await userEvent.type(screen.getByLabelText(/Why are you disputing it/), "Different headlights.");
    await userEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    rerender(<VotePanel viewer={viewer()} onVote={onVote} pending={false} error="Closed." />);
    expect(screen.getByLabelText(/Why are you disputing it/)).toHaveValue("Different headlights.");
    expect(screen.getByRole("alert")).toHaveTextContent("Closed.");
  });

  it("shows the viewer's current vote", () => {
    render(<VotePanel viewer={viewer({ current: "confirm" })} onVote={vi.fn()} pending={false} error={null} />);
    expect(screen.getByText(/You confirmed this/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("discovery page community actions (sample source)", () => {
  it("posts a comment and shows it after the server confirms", async () => {
    const item = byStatus("verified");
    withQuery(<DiscoveryDetailView id={item.id} />);
    const box = await screen.findByLabelText("Add a comment");
    // Paste rather than type: per-keystroke re-renders of the whole page are slow under a parallel run.
    await userEvent.click(box);
    await userEvent.paste("Sample comment from a test");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Sample comment from a test")).toBeInTheDocument();
    await waitFor(() => expect(box).toHaveValue(""));
  });

  it("disputes and shows the status the server returns", async () => {
    const item = byStatus("awaiting_verification");
    withQuery(<DiscoveryDetailView id={item.id} />);
    await userEvent.click(await screen.findByRole("button", { name: "Dispute" }));
    await userEvent.type(screen.getByLabelText(/Why are you disputing it/), "Wrong vehicle model entirely.");
    await userEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(await within(header).findByText("Disputed")).toBeInTheDocument();
    expect(screen.getByText(/You disputed this/)).toBeInTheDocument();
  });

  it("reports a discovery and confirms it was sent", async () => {
    const item = byStatus("verified");
    withQuery(<DiscoveryDetailView id={item.id} />);
    await userEvent.click(await screen.findByRole("button", { name: "Report" }));
    const dialog = screen.getByRole("dialog", { name: "Report this discovery" });
    await userEvent.click(within(dialog).getByLabelText("Spam or advertising"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Send report" }));
    expect(await within(dialog).findByText(/Moderators will review your report/)).toBeInTheDocument();
  });

  it("shows sign-in prompts instead of actions when signed out", async () => {
    signedIn = false;
    withQuery(<DiscoveryDetailView id={byStatus("verified").id} />);
    expect(await screen.findByText(/to join the discussion/)).toBeInTheDocument();
    expect(screen.getByText(/to confirm or dispute discoveries/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Add a comment")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });
});

describe("CommunityHub", () => {
  it("defaults to the review queue and lists only discoveries awaiting review", async () => {
    withQuery(<CommunityHub />);
    const nav = await screen.findByRole("navigation", { name: "Review queues" });
    expect(within(nav).getByRole("link", { name: "Needs review" })).toHaveAttribute("aria-current", "page");
    await screen.findByText(/in queue/);
    const badges = [...document.querySelectorAll("article [data-status]")].map((b) => b.getAttribute("data-status"));
    expect(new Set(badges)).toEqual(new Set(["awaiting_verification"]));
  });

  it("switches queue from the URL", async () => {
    search = "queue=disputed";
    withQuery(<CommunityHub />);
    const nav = await screen.findByRole("navigation", { name: "Review queues" });
    expect(within(nav).getByRole("link", { name: "Disputed" })).toHaveAttribute("aria-current", "page");
    expect(queueFromParam("nonsense").key).toBe("review");
  });

  it("explains every status in plain language", async () => {
    withQuery(<CommunityHub />);
    expect(await screen.findByText(/No person has checked it yet/)).toBeInTheDocument();
    expect(screen.getByText(/strongest status/)).toBeInTheDocument();
  });
});
