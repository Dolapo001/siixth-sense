/**
 * The Sixth Sense backend, e.g. "https://api.sixthsense.gg/api/v1". When it's
 * set, every feature reads live data through this app's /api/backend proxy;
 * unset, development falls back to labelled sample data.
 */
export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
}

export function liveApiEnabled() {
  return apiBaseUrl() !== "";
}
