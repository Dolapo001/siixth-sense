/** `/world/abc` → "abc"; `/world` → null. The URL is the source of truth for the selected location. */
export function selectedLocationFromPath(pathname: string | null) {
  const match = pathname?.match(/^\/world\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function locationHref(locationId: string) {
  return `/world/${encodeURIComponent(locationId)}`;
}
