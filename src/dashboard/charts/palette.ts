// Chart palette + motion helper, deliberately free of any ECharts import so eager modules
// (the Dashboard) can reference the colors without pulling ECharts into the main chunk.
// ECharts lives only in the lazily-loaded chart component.

// Mirrors the tokens in src/index.css (ECharts can't read CSS vars). Keep in sync.
export const CHART = {
  ink: "#fdf3e8",
  inkSecondary: "#b89274",
  inkMuted: "#6e503a",
  accent: "#f77f1b",
  accentBright: "#ffa033",
  ok: "#6bbf7e",
  down: "#e0705f",
  grid: "rgba(184,146,116,0.10)",
  axis: "rgba(184,146,116,0.25)",
  surface: "#140d07",
  elevated: "#1c1209",
} as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
