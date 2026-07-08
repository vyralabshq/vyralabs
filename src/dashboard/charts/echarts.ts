// Tree-shaken ECharts: only the modules the dashboard uses are registered, so the full
// bundle never loads. This module is imported only by the dashboard entry, keeping
// ECharts out of the landing page.

import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

export { echarts };

// Chart palette. Mirrors the tokens in src/index.css (ECharts can't read CSS vars),
// so charts match the rest of the site. Keep in sync if the theme changes.
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
