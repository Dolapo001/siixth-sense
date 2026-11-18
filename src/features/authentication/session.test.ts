import { afterEach, describe, expect, it, vi } from "vitest";
import { getSession, SAMPLE_VIEWER } from "./session";

afterEach(() => vi.unstubAllEnvs());

describe("getSession", () => {
  it("is signed out by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_DEV_SAMPLE_VIEWER", "");
    expect(await getSession()).toBeNull();
  });

  it("never signs in the sample viewer without dev mocks", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "");
    vi.stubEnv("NEXT_PUBLIC_DEV_SAMPLE_VIEWER", "true");
    expect(await getSession()).toBeNull();
  });

  it("signs in the sample viewer only when both are switched on", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_DEV_SAMPLE_VIEWER", "true");
    expect(await getSession()).toEqual({ user: SAMPLE_VIEWER });
  });
});
