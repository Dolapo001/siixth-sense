import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return {
    seo: await import("./seo"),
    robots: (await import("@/app/robots")).default,
    sitemap: (await import("@/app/sitemap")).default,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("indexing rules", () => {
  it("keeps public pages out of search until the backend is connected", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const { seo, sitemap } = await load();
    expect(seo.publicPage({ title: "World", description: "d", path: "/world" }).robots).toEqual({
      index: false,
      follow: true,
    });
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).not.toContainEqual(expect.stringContaining("/discoveries"));
    // The World pages show real map data already, so they're listed regardless.
    expect(urls).toContainEqual(expect.stringMatching(/\/world$/));
    expect(urls).toContainEqual(expect.stringMatching(/\/world\/L1$/));
  });

  it("indexes public pages, with canonicals, once an API is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example.test");
    const { seo, sitemap } = await load();
    const meta = seo.publicPage({ title: "Discoveries", description: "d", path: "/discoveries" });
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe("/discoveries");
    expect(sitemap().map((entry) => entry.url)).toContain("https://site.example.test/discoveries");
  });

  it("disallows personal, account and admin pages", async () => {
    const { robots } = await load();
    const disallow = robots().rules;
    const list = Array.isArray(disallow) ? disallow[0].disallow : disallow.disallow;
    for (const path of ["/admin", "/auth", "/settings", "/profile$"]) expect(list).toContain(path);
    expect(list).not.toContain("/world");
  });
});
