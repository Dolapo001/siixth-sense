import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isGroupMuted, linkFor, muteGroups, withGroupMuted } from "./kinds";

vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

let signedIn = true;
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () => (signedIn ? { user: { username: "sample_viewer", displayName: "You (sample viewer)" }, walletOnly: false } : null),
}));

const { createMockNotificationsSource, __resetSampleNotifications, __notifySample } = await import("./data/mock-source");
const { NotificationsView } = await import("./notifications-view");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  signedIn = true;
  __resetSampleNotifications();
});

describe("where a notification links", () => {
  it.each([
    ["discovery_verified", { discovery: "d1" }, "/discoveries/d1", "View discovery"],
    ["comment_received", { discovery: "d1", comment: "c9" }, "/discoveries/d1#comment-c9", "View comment"],
    ["follow", { username: "sol_abc" }, "/profile/sol_abc", "View profile"],
    ["reward_eligible", { reward: "r1" }, "/rewards", "View rewards"],
    ["analysis_completed", { analysis: "a1" }, "/analyze", "Open Analyze"],
    ["role_promoted", {}, "/profile", "View profile"],
    ["wallet_connected", {}, "/web3", "View wallet"],
  ])("%s → %s", (kind, data, href, label) => {
    expect(linkFor(kind, data)).toEqual({ href, label });
  });

  it("has nowhere to send moderation or unknown kinds", () => {
    expect(linkFor("warning", { note: "Be kind." })).toBeNull();
    expect(linkFor("report_resolved", { report: "rp1", outcome: "dismissed" })).toBeNull();
    expect(linkFor("brand_new_kind", {})).toBeNull();
  });

  it("encodes ids it puts in URLs", () => {
    expect(linkFor("follow", { username: "a/b" })?.href).toBe("/profile/a%2Fb");
  });
});

describe("muting", () => {
  it("never offers to mute moderation", () => {
    const mutable = muteGroups.flatMap((g) => g.kinds);
    for (const kind of ["warning", "report_received", "report_resolved"]) expect(mutable).not.toContain(kind);
  });

  it("switches a whole group, keeping kinds this screen doesn't know about", () => {
    const comments = muteGroups.find((g) => g.id === "comments")!;
    const muted = withGroupMuted(["some_future_kind"], comments, true);
    expect(muted).toEqual(["comment_received", "reply_received", "some_future_kind"]);
    expect(isGroupMuted(comments, muted)).toBe(true);
    expect(withGroupMuted(muted, comments, false)).toEqual(["some_future_kind"]);
  });

  it("counts a group as on while any kind in it is still on", () => {
    const comments = muteGroups.find((g) => g.id === "comments")!;
    expect(isGroupMuted(comments, ["comment_received"])).toBe(false);
  });
});

describe("live adapter", () => {
  let requests: { url: string; method: string; body: unknown }[] = [];
  let respond: (url: string, method: string) => Response;
  const ok = (data: unknown, status = 200) => Response.json({ success: true, message: "OK", data }, { status });
  const fail = (status: number) => Response.json({ success: false, message: "No.", code: "x", errors: {} }, { status });

  beforeEach(() => {
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        const method = init.method ?? "GET";
        requests.push({ url, method, body: typeof init.body === "string" ? JSON.parse(init.body) : null });
        return respond(url, method);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const live = async () => (await import("./data/api-source")).createApiNotificationsSource();

  it("maps the page, links each item, and carries the unread total", async () => {
    respond = () =>
      ok({
        count: 2,
        page: 1,
        page_size: 25,
        total_pages: 1,
        unread_count: 7,
        results: [
          { public_id: "n1", kind: "comment_received", title: "New comment", data: { discovery: "d1", comment: "c1" }, read: false, created_at: "2026-11-18T10:00:00Z" },
          { public_id: "n2", kind: "warning", title: "A warning", data: { note: "Please keep it civil." }, read: true, created_at: "2026-11-18T09:00:00Z" },
        ],
      });
    const page = await (await live()).list(1, { unreadOnly: true });
    expect(requests[0].url).toContain("unread=1");
    expect(page).toMatchObject({ total: 2, unread: 7 });
    expect(page!.items[0]).toMatchObject({ id: "n1", read: false, link: { href: "/discoveries/d1#comment-c1" } });
    expect(page!.items[1]).toMatchObject({ link: null, note: "Please keep it civil." });
  });

  it("reads as signed out on 401, and as an empty page past the last one", async () => {
    respond = () => fail(401);
    expect(await (await live()).list(1)).toBeNull();
    expect(await (await live()).unreadCount()).toBeNull();
    respond = () => fail(404);
    expect(await (await live()).list(9)).toMatchObject({ items: [], total: 0 });
  });

  it("never sends the empty body the backend reads as 'mark everything read'", async () => {
    respond = () => ok({ marked: 1 });
    const source = await live();
    await source.markRead([]);
    expect(requests).toHaveLength(0);
    await source.markRead(["n1", "n2"]);
    expect(requests[0]).toMatchObject({ method: "POST", body: { ids: ["n1", "n2"] } });
    await source.markAllRead();
    expect(requests[1]).toMatchObject({ method: "POST", body: { all: true } });
  });

  it("saves the muted kinds the server sends back", async () => {
    respond = () => ok({ muted: ["follow"] });
    expect(await (await live()).setMuted(["follow", "follow"])).toEqual(["follow"]);
    expect(requests[0]).toMatchObject({ method: "PUT", body: { muted: ["follow", "follow"] } });
  });
});

describe("notifications page (sample source)", () => {
  it("asks signed-out players to sign in", async () => {
    signedIn = false;
    withQuery(<NotificationsView />);
    expect(await screen.findByText("Sign in to see your notifications")).toBeInTheDocument();
  });

  it("lists notifications, unread first-class, with links and a sample label", async () => {
    withQuery(<NotificationsView />);
    const list = await screen.findByRole("list");
    expect(screen.getByText("Sample data")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(within(list).getAllByText(/^Unread:/)).toHaveLength(3);
    expect(within(list).getAllByRole("link", { name: "View discovery" }).length).toBeGreaterThan(0);
  });

  it("marks one read, then all, keeping the unread count in step", async () => {
    withQuery(<NotificationsView />);
    expect(await screen.findByRole("button", { name: "Unread (3)" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Mark as read" })[0]);
    expect(await screen.findByRole("button", { name: "Unread (2)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByRole("button", { name: "Unread (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
    expect(screen.queryAllByText(/^Unread:/)).toHaveLength(0);
  });

  it("filters to unread, and says when there's nothing left", async () => {
    withQuery(<NotificationsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Unread (3)" }));
    await waitFor(() => expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(3));
    await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it("mutes a group, which stops new notifications of those kinds", async () => {
    withQuery(<NotificationsView />);
    const followers = await screen.findByRole("checkbox", { name: /New followers/ });
    expect(followers).toBeChecked();
    await userEvent.click(followers);
    await waitFor(() => expect(followers).not.toBeChecked());
    expect(await createMockNotificationsSource().getMuted()).toEqual(["follow"]);

    __notifySample("follow", "someone started following you", { username: "someone" });
    __notifySample("comment_received", "New comment", { discovery: "x" });
    const page = await createMockNotificationsSource().list(1);
    expect(page!.items.some((n) => n.title === "someone started following you")).toBe(false);
    expect(page!.items[0].title).toBe("New comment"); // other kinds still arrive
  });
});
