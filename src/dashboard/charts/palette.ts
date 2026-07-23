// Chart palette + motion helper, deliberately free of any ECharts import so eager modules
// (the Dashboard) can reference the colors without pulling ECharts into the main chunk.
// ECharts lives only in the lazily-loaded chart component.

// Mirrors the tokens in src/index.css (ECharts can't read CSS vars). Keep in sync.
export const CHART = {
  ink: "#f3e6d4",
  inkSecondary: "#d4bc9c",
  inkMuted: "#6f5640",
  accent: "#e87820",
  accentBright: "#f59a3d",
  ok: "#6bbf7e",
  down: "#e0705f",
  grid: "rgba(243,230,212,0.08)",
  axis: "rgba(243,230,212,0.18)",
  surface: "#15110c",
  elevated: "#1f1912",
} as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
