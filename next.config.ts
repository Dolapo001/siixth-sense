import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origin of the backend API, if configured, so the browser may call it. */
function apiOrigin() {
  try {
    return process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin : "";
  } catch {
    return "";
  }
}

/*
 * Content Security Policy without nonces: nonces would force every page to
 * render per request, which cacheComponents / partial prerendering avoid.
 * - worker-src blob: MapLibre's web worker.
 * - img-src https: screenshots and avatars will come from a host the backend
 *   hasn't named yet; tighten this once it's known.
 * - style-src 'unsafe-inline': Motion and MapLibre set inline styles.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin()}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The MapLibre worker's filename carries its version, so it can be cached for good.
      { source: "/vendor/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  // Common auth URLs people type, sent to the real routes under /auth.
  async redirects() {
    return [
      ...["/sign-in", "/signin", "/login"].map((source) => ({ source, destination: "/auth/login", permanent: false })),
      ...["/sign-up", "/signup", "/register"].map((source) => ({
        source,
        destination: "/auth/register",
        permanent: false,
      })),
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
