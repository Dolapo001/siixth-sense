/**
 * Reads a short confirmation to screen readers ("Comment posted") through one
 * shared polite live region, for actions whose visible result is easy to miss.
 * The region is rendered empty by the root layout; it's created here only as a
 * fallback (e.g. in tests).
 */
export const ANNOUNCER_ID = "ss-announcer";

export function announce(message: string) {
  if (typeof document === "undefined") return;
  let region = document.getElementById(ANNOUNCER_ID);
  if (!region) {
    region = document.createElement("div");
    region.id = ANNOUNCER_ID;
    region.setAttribute("aria-live", "polite");
    region.className = "sr-only";
    document.body.append(region);
  }
  // Clear first so the same message twice is announced twice.
  region.textContent = "";
  const target = region;
  setTimeout(() => {
    target.textContent = message;
  }, 50);
}
