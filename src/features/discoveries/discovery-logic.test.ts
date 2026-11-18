import { describe, expect, it } from "vitest";
import { createMockAnalysisSource } from "@/features/image-analysis/data/mock-source";
import { getSampleWorld } from "@/features/world/data/mock-source";
import { __sample, createMockDiscoverySource, queryDiscoveries } from "./data/mock-source";
import { defaultQuery, isFiltered, PAGE_SIZE, parseDiscoveryQuery, serializeDiscoveryQuery } from "./query";

const params = (qs: string) => new URLSearchParams(qs);

describe("parseDiscoveryQuery", () => {
  it("returns defaults for an empty URL", () => {
    expect(parseDiscoveryQuery(params(""))).toEqual(defaultQuery);
  });

  it("reads every filter", () => {
    expect(
      parseDiscoveryQuery(params("q=dock&category=vehicle,wildlife&region=r1&status=verified&sort=oldest&page=3")),
    ).toEqual({
      q: "dock",
      categories: ["vehicle", "wildlife"],
      regionId: "r1",
      verification: "verified",
      contributor: null,
      sort: "oldest",
      page: 3,
    });
  });

  it("ignores junk instead of failing", () => {
    expect(parseDiscoveryQuery(params("category=vehicle,spaceship,vehicle&status=bogus&sort=random&page=-4"))).toEqual({
      ...defaultQuery,
      categories: ["vehicle"],
    });
    expect(parseDiscoveryQuery(params("page=abc")).page).toBe(1);
  });

  it("round-trips through the URL and omits defaults", () => {
    const query = { ...defaultQuery, q: "pier", categories: ["event" as const], page: 2 };
    expect(serializeDiscoveryQuery(query)).toBe("q=pier&category=event&page=2");
    expect(parseDiscoveryQuery(params(serializeDiscoveryQuery(query)))).toEqual(query);
    expect(serializeDiscoveryQuery(defaultQuery)).toBe("");
  });

  it("knows when filters are applied (sort alone isn't a filter)", () => {
    expect(isFiltered({ ...defaultQuery, sort: "oldest" })).toBe(false);
    expect(isFiltered({ ...defaultQuery, verification: "disputed" })).toBe(true);
  });
});

describe("queryDiscoveries (server-style filtering)", () => {
  const items = __sample.items;

  it("pages results and clamps out-of-range pages", () => {
    const first = queryDiscoveries(items, defaultQuery);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.total).toBe(items.length);
    const lastPage = Math.ceil(items.length / PAGE_SIZE);
    expect(queryDiscoveries(items, { ...defaultQuery, page: 999 }).page).toBe(lastPage);
  });

  it("filters by category, region, status and search together", () => {
    const query = { ...defaultQuery, categories: ["vehicle" as const], verification: "verified" as const };
    const result = queryDiscoveries(items, { ...query, page: 1 });
    expect(result.items.every((i) => i.category === "vehicle" && i.verification === "verified")).toBe(true);
    const region = getSampleWorld().regions[0].id;
    expect(
      queryDiscoveries(items, { ...defaultQuery, regionId: region }).items.every(
        (i) => i.location?.regionId === region,
      ),
    ).toBe(true);
    const target = items[5];
    expect(queryDiscoveries(items, { ...defaultQuery, q: target.title.toUpperCase() }).items[0].id).toBe(target.id);
  });

  it("sorts newest, oldest and by engagement", () => {
    const times = (sort: "newest" | "oldest") =>
      queryDiscoveries(items, { ...defaultQuery, sort }).items.map((i) => new Date(i.submittedAt).getTime());
    const newest = times("newest");
    expect([...newest].sort((a, b) => b - a)).toEqual(newest);
    const oldest = times("oldest");
    expect([...oldest].sort((a, b) => a - b)).toEqual(oldest);
    const discussed = queryDiscoveries(items, { ...defaultQuery, sort: "discussed" }).items.map(
      (i) => i.engagement.comments,
    );
    expect([...discussed].sort((a, b) => b - a)).toEqual(discussed);
  });

  it("returns an empty page when nothing matches", () => {
    expect(queryDiscoveries(items, { ...defaultQuery, q: "zzz-no-match" })).toMatchObject({
      items: [],
      total: 0,
      page: 1,
    });
  });
});

describe("sample data integrity", () => {
  it("has a discovery for every one the World Explorer links to", async () => {
    const source = createMockDiscoverySource();
    const linked = [...getSampleWorld().locations.values()].flatMap((l) => l.discoveries.map((d) => d.id));
    expect(linked.length).toBeGreaterThan(0);
    const ids = new Set(__sample.items.map((i) => i.id));
    expect(linked.every((id) => ids.has(id))).toBe(true);
    expect(await source.getDiscovery(linked[0])).not.toBeNull();
  });

  it("links analysis results only to discoveries that exist", async () => {
    const ids = new Set(__sample.items.map((i) => i.id));
    const uploader = createMockAnalysisSource();
    const jobIds = await Promise.all(
      ["a.png", "b.png", "c.png", "d.png", "e.png"].map(async (name) => {
        const file = new File(["x"], name, { type: "image/png" });
        const { jobId } = await uploader.upload(file, { signal: new AbortController().signal, onProgress: () => {} });
        return jobId;
      }),
    );
    // The mock's job store is shared; a clock far in the future reads every job as completed.
    const later = createMockAnalysisSource(() => Date.now() + 60_000);
    let checked = 0;
    for (const jobId of jobIds) {
      const job = await later.getJob(jobId);
      expect(job.status).toBe("completed");
      for (const detection of job.detections) {
        for (const related of detection.relatedDiscoveries) {
          expect(ids.has(related.id)).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("gives every discovery a history that starts as an AI suggestion and ends at its status", async () => {
    const source = createMockDiscoverySource();
    const items = __sample.items.slice(0, 30);
    const details = await Promise.all(items.map((item) => source.getDiscovery(item.id)));
    for (const [index, item] of items.entries()) {
      const detail = details[index]!;
      expect(detail.verificationHistory[0].status).toBe("ai_suggested");
      expect(detail.verificationHistory.at(-1)!.status).toBe(item.verification);
      expect(detail.comments).toHaveLength(item.engagement.comments);
      if (detail.attestation) expect(detail.verification).toBe("verified");
    }
  });

  it("never produces negative counts or out-of-range confidence", async () => {
    for (const item of __sample.items) {
      expect(item.engagement.comments).toBeGreaterThanOrEqual(0);
      expect(item.engagement.confirmations).toBeGreaterThanOrEqual(0);
    }
    const source = createMockDiscoverySource();
    const details = await Promise.all(__sample.items.map((item) => source.getDiscovery(item.id)));
    for (const detail of details) {
      for (const d of detail!.detections) {
        expect(d.confidence).toBeGreaterThanOrEqual(0);
        expect(d.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns null for unknown ids", async () => {
    expect(await createMockDiscoverySource().getDiscovery("nope")).toBeNull();
  });
});
