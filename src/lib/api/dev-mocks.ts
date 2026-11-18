/**
 * Dev mocks are used only when explicitly enabled or in local development.
 * Production with no API configured gets no data source and shows "not connected".
 */
export function devMocksEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_MOCKS === "true" || process.env.NODE_ENV === "development";
}
