import { useEffect, useRef } from "react";
import type { EChartsType } from "echarts/core";
import { echarts } from "./echarts";
import { CHART, prefersReducedMotion } from "./palette";

// Radial family in the Vyra theme: a single-value gauge (efficiency-style dials) and a
// composition donut. Both are pure presentational wrappers around one ECharts instance,
// living in the lazily-loaded chart chunk so ECharts stays out of the eager bundle.

function useChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);
  return { ref, chartRef };
}

const mono = "JetBrains Mono, monospace";

/** A 240° dial for a single 0–100 value. Colour bands warm as the value climbs. */
export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

/** A composition ring with an overlaid centre label. Legend is drawn by the caller. */
export function DonutChart({
  segments,
  height = 190,
  centerTop,
  centerBottom,
}: {
  segments: DonutSegment[];
  height?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const { ref, chartRef } = useChart();
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(
      {
        animation: !prefersReducedMotion(),
        tooltip: {
          trigger: "item",
          backgroundColor: CHART.elevated,
          borderColor: CHART.axis,
          textStyle: { color: CHART.ink, fontSize: 11, fontFamily: mono },
          valueFormatter: (v: number) => Math.round(v).toLocaleString("en-US"),
        },
        series: [
          {
            type: "pie",
            radius: ["64%", "88%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: false,
            label: { show: false },
            labelLine: { show: false },
            itemStyle: { borderColor: CHART.surface, borderWidth: 2 },
            data: segments.map((s) => ({
              value: s.value,
              name: s.name,
              itemStyle: { color: s.color },
            })),
          },
        ],
      },
      true,
    );
  }, [segments, chartRef]);
  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <div ref={ref} style={{ height, width: "100%" }} />
      {(centerTop || centerBottom) && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          {centerTop && (
            <span className="font-display text-[22px] font-bold leading-none tabular-nums text-ink">
              {centerTop}
            </span>
          )}
          {centerBottom && (
            <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-ink-tertiary">
              {centerBottom}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
