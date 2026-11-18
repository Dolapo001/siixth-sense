/**
 * Brand hex values for contexts that can't read CSS variables
 * (ImageResponse icons and OG images). Must match @theme in globals.css;
 * colors.test.ts enforces this.
 */
export const brandColors = {
  midnight: "#0b1018",
  accent: "#55d6d0",
  fg: "#f2f4f5",
  muted: "#8995a5",
  signal: "#f29b52",
  surface: "#111a25",
  "surface-elevated": "#172331",
  border: "#273443",
  "border-strong": "#5a6a7d",
} as const;
