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
  it("lists only the landing page, since the app is behind sign-in", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example.test");
    const { sitemap } = await load();
    expect(sitemap().map((entry) => entry.url)).toEqual(["https://site.example.test"]);
  });

  it("keeps canonicals on platform pages but leaves them out of search", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
    const { seo } = await load();
    const meta = seo.publicPage({ title: "Discoveries", description: "d", path: "/discoveries" });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("/discoveries");
  });

  it("disallows personal, account and admin pages", async () => {
    const { robots } = await load();
    const disallow = robots().rules;
    const list = Array.isArray(disallow) ? disallow[0].disallow : disallow.disallow;
    for (const path of ["/admin", "/auth", "/settings", "/profile$"]) expect(list).toContain(path);
    expect(list).not.toContain("/world");
  });
});
