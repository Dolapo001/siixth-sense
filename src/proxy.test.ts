import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/backend.server";
import { proxy } from "./proxy";

const visit = (path: string, cookie?: string) =>
  proxy(new NextRequest(`https://site.example.test${path}`, { headers: cookie ? { cookie: `${cookie}=x` } : {} }));

describe("sign-in gate", () => {
  it("sends signed-out visitors to sign-in, keeping where they were going", () => {
    const response = visit("/discoveries?sort=oldest");
    expect(response.status).toBe(307);
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/auth/login");
    expect(target.searchParams.get("next")).toBe("/discoveries?sort=oldest");
  });

  it("lets signed-out visitors see the landing page, sign-in and email verification", () => {
    for (const path of ["/", "/auth/login", "/auth/register", "/verify-email"]) {
      expect(visit(path).headers.get("location"), path).toBeNull();
    }
  });

  it("lets players with either session cookie through", () => {
    expect(visit("/analyze", ACCESS_COOKIE).headers.get("location")).toBeNull();
    // An expired access token is renewed from the refresh cookie.
    expect(visit("/analyze", REFRESH_COOKIE).headers.get("location")).toBeNull();
  });
});
