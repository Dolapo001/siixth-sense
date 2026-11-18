import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiDiscoverySource, placeIdFromTags } from "@/features/discoveries/data/api-source";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import { createApiProfileSource } from "@/features/profiles/data/api-source";
import { ApiError, readEnvelope } from "./client";
import { avatarIdFromUrl, avatarUrlFor, fromBackendCategory, toBackendCategory, toPrecision, toVerification } from "./mappers";

const ok = (data: unknown, status = 200) => Response.json({ success: true, message: "OK", data }, { status });
const fail = (message: string, status: number, extra: object = {}) =>
  Response.json({ success: false, message, code: "conflict", errors: {}, ...extra }, { status });

let requests: { url: string; method: string; body: unknown }[] = [];
let respond: (url: string, method: string) => Response;

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

const discovery = {
  public_id: "d1",
  title: "Pink flamingo by the pier",
  category: "wildlife",
  description: "Spotted at dusk",
  status: "submitted",
  tags: ["place:L1"],
  location: { public_id: null, name: null, region: null, precision: "unknown" },
  region: null,
  contributor: "sol_abc",
  engagement: { comments: 2, confirmations: 1 },
  verification: "awaiting_verification",
  screenshot: { url: "http://127.0.0.1:8000/media/a.png", alt: "Pink flamingo by the pier" },
  created_at: "2026-11-18T10:00:00Z",
};

describe("vocabulary", () => {
  it("maps the backend's words onto the UI's", () => {
    expect(toPrecision("exact")).toBe("confirmed");
    expect(toPrecision("nonsense")).toBe("unknown");
    expect(toVerification("under_review")).toBe("awaiting_verification");
    expect(fromBackendCategory("location", ["landmark"])).toBe("landmark");
    expect(toBackendCategory("collectible")).toBe("object");
  });

  it("round-trips preset avatars through the backend's URL field", () => {
    expect(avatarIdFromUrl(avatarUrlFor("gator", "https://sixthsense.gg"))).toBe("gator");
    expect(avatarIdFromUrl("https://cdn.example/photo.png")).toBeNull();
    expect(avatarUrlFor(null, "https://sixthsense.gg")).toBe("");
  });

  it("shows the server's own message, or the first field error behind a generic one", async () => {
    await expect(readEnvelope(fail("You can't vote on your own discovery.", 403))).rejects.toThrow("You can't vote on your own discovery.");
    const validation = Response.json(
      { success: false, message: "Validation failed.", code: "validation_error", errors: { body: ["Body is too long."] } },
      { status: 400 },
    );
    await expect(readEnvelope(validation)).rejects.toMatchObject({ message: "Body is too long.", status: 400 });
  });
});

describe("discoveries from the backend", () => {
  it("lists through the proxy with the backend's filters and paging", async () => {
    respond = () => ok({ count: 1, page: 2, page_size: 12, total_pages: 1, results: [discovery] });
    const page = await createApiDiscoverySource().listDiscoveries({
      q: " flamingo ",
      categories: ["wildlife", "landmark"],
      regionId: null,
      verification: "verified",
      contributor: null,
      sort: "confirmed",
      page: 2,
    });
    const url = new URL(requests[0].url, "http://localhost");
    expect(url.pathname).toBe("/api/backend/discoveries");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "flamingo",
      categories: "wildlife,location",
      verification: "verified",
      sort: "confirmed",
      page: "2",
      page_size: "12",
    });
    expect(page).toMatchObject({ total: 1, page: 2, pageSize: 12 });
    expect(page.items[0]).toMatchObject({
      id: "d1",
      category: "wildlife",
      verification: "awaiting_verification",
      contributor: { username: "sol_abc" },
      // The World map place travels as a tag until the backend holds gtadb places.
      location: { locationId: "L1", precision: "approximate" },
    });
  });

  it("names a hidden contributor without linking a profile, and doesn't offer to follow them", async () => {
    respond = () =>
      ok({
        ...discovery,
        contributor: null,
        contributor_info: null,
        detections: [],
        evidence_items: [],
        suggestions: [],
        verification_history: [],
        comments: [],
        related: [],
        attestation: null,
        viewer: {
          canComment: true,
          canSuggest: true,
          canAddEvidence: true,
          canReport: true,
          vote: { allowed: false, reason: "Only Verified Contributors can vote.", current: null },
          followingContributor: false,
        },
      });
    const detail = (await createApiDiscoverySource().getDiscovery("d1"))!;
    expect(detail.contributor.username).toBe("");
    expect(detail.viewer?.followingContributor).toBeUndefined();
    expect(detail.viewer?.vote.reason).toBe("Only Verified Contributors can vote.");
  });

  it("returns null for a discovery that doesn't exist (or is private)", async () => {
    respond = () => fail("Not found.", 404);
    expect(await createApiDiscoverySource().getDiscovery("nope")).toBeNull();
  });

  it("shares an analysis at a map place, and explains a duplicate", async () => {
    respond = () => ok({ public_id: "new1" }, 201);
    const source = createApiDiscoverySource();
    const input = {
      analysisJobId: "job1",
      title: "Lighthouse",
      category: "landmark" as const,
      note: "Seen from the beach",
      location: { id: "L42", name: "Lighthouse", areas: [] },
    };
    expect(await source.submitDiscovery(input)).toEqual({ id: "new1" });
    expect(requests[0].body).toEqual({
      analysis: "job1",
      title: "Lighthouse",
      category: "location",
      description: "Seen from the beach",
      tags: ["landmark", "place:L42"],
      submit: true,
    });
    expect(placeIdFromTags((requests[0].body as { tags: string[] }).tags)).toBe("L42");

    respond = () => fail("Likely duplicates found.", 409, { data: { duplicates: [{ title: "Lighthouse at dawn" }] } });
    await expect(source.submitDiscovery(input)).rejects.toThrow(ActionRefusedError);
    await expect(source.submitDiscovery(input)).rejects.toThrow('"Lighthouse at dawn"');
  });

  it("turns refusals into ActionRefusedError with the server's message", async () => {
    respond = () => fail("You've already voted on this discovery.", 409);
    await expect(createApiDiscoverySource().vote("d1", "confirm", "Matches the trailer")).rejects.toEqual(
      new ActionRefusedError("You've already voted on this discovery."),
    );
  });
});

describe("profiles from the backend", () => {
  it("keeps privacy: stats the player hides stay null instead of becoming zero", async () => {
    respond = (url) =>
      url.includes("/discoveries")
        ? fail("Not found.", 404)
        : ok({
            username: "sol_abc",
            display_name: "",
            bio: "",
            avatar_url: "https://sixthsense.gg/avatar-presets/palm",
            joined: "2026-11-18T10:00:00Z",
            reputation_score: 12,
            stats: { submitted: 3, verified: 1, reviews: null, comments: null },
            regions_explored: 2,
            achievements: [{ code: "first_verified", name: "First verified", description: "…", earned_at: "2026-11-18T11:00:00Z" }],
            wallet: null,
          });
    const profile = (await createApiProfileSource().getProfile("sol_abc"))!;
    expect(profile).toMatchObject({
      displayName: "sol_abc",
      avatarId: "palm",
      avatarUrl: null,
      reputation: 12,
      stats: { submitted: 3, verified: 1, reviews: null, comments: null },
      regionsExplored: 2,
      byCategory: {},
    });
    expect(profile.achievements[0].id).toBe("first_verified");
  });

  it("refuses a username change the backend can't make", async () => {
    respond = () => ok({ username: "sol_abc" });
    const source = createApiProfileSource();
    expect(await source.checkUsername("sol_abc")).toEqual({ available: true });
    expect((await source.checkUsername("new_name")).available).toBe(false);
    await expect(source.updateProfile({ username: "new_name", displayName: "X Y", bio: null, avatarId: null })).rejects.toThrow(
      "Usernames can't be changed yet.",
    );
    expect(requests.some((r) => r.method === "PATCH")).toBe(false);
  });
});

describe("screenshot analysis from the backend", () => {
  /** The upload goes over XMLHttpRequest (for progress); answer it with `image`. */
  function stubUpload(image: { public_id: string; latest_analysis: string | null }) {
    class FakeXhr {
      status = 200;
      responseText = "";
      responseType = "";
      upload = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      open() {}
      abort() {}
      send() {
        this.responseText = JSON.stringify({ success: true, message: "OK", data: image });
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  }

  const upload = async () => {
    const { createApiAnalysisSource } = await import("@/features/image-analysis/data/api-source");
    const source = await createApiAnalysisSource();
    const file = new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });
    return source.upload(file, { onProgress: () => {}, signal: new AbortController().signal });
  };

  const constraints = { maxBytes: 10_000_000, acceptedTypes: ["image/png"], pollIntervalMs: 1000 };

  it("starts a fresh analysis when a re-uploaded screenshot's last one failed", async () => {
    // Found live 2026-11-18: identical bytes return the existing image, and the
    // adapter reused its failed analysis, so the screenshot could never succeed.
    stubUpload({ public_id: "img1", latest_analysis: "old" });
    respond = (url, method) =>
      url.endsWith("/analyses/constraints") ? ok(constraints)
      : url.endsWith("/analyses/old") ? ok({ status: "failed" })
      : url.endsWith("/analyses") && method === "POST" ? ok({ public_id: "fresh" }, 201)
      : fail("unexpected", 500);
    expect(await upload()).toEqual({ jobId: "fresh" });
    expect(requests.find((r) => r.method === "POST")?.body).toEqual({ image: "img1" });
  });

  it("reuses a re-uploaded screenshot's analysis that has results, without paying again", async () => {
    stubUpload({ public_id: "img1", latest_analysis: "done" });
    respond = (url) =>
      url.endsWith("/analyses/constraints") ? ok(constraints)
      : url.endsWith("/analyses/done") ? ok({ status: "completed" })
      : fail("unexpected", 500);
    expect(await upload()).toEqual({ jobId: "done" });
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });
});

it("ApiError keeps the status for callers that branch on it", () => {
  expect(new ApiError("Nope", 409).status).toBe(409);
});
