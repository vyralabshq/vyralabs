import { useEffect, useRef } from "react";
import type { EChartsType } from "echarts/core";
import { echarts } from "./echarts";
import { CHART, prefersReducedMotion } from "./palette";

export interface ChartSeries {
  name: string;
  /** aligned 1:1 with `times`; null means a gap (source failed that cycle). */
  data: (number | null)[];
  color: string;
  area?: boolean;
}

// Mission-control time-series chart in the Vyra theme. Gradient area fills, muted axes,
// mono labels. Pure presentational wrapper around one ECharts instance.
export function TimeSeriesChart({
  times,
  series,
  height = 200,
  yFormatter,
  yMin,
  yMax,
  band,
}: {
  times: (Date | null)[];
  series: ChartSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  /** Fixed y-axis bounds so a tiny wiggle does not auto-scale to full height. */
  yMin?: number;
  yMax?: number;
  /** Shaded "normal" range [low, high] so deviation reads as signal, not noise. */
  band?: [number, number];
}) {
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

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.setOption(
      {
        animation: !prefersReducedMotion(),
        grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
        textStyle: { fontFamily: "JetBrains Mono, monospace", color: CHART.inkMuted },
        tooltip: {
          trigger: "axis",
          backgroundColor: CHART.elevated,
          borderColor: CHART.axis,
          textStyle: { color: CHART.ink, fontSize: 11 },
          axisPointer: { lineStyle: { color: CHART.axis } },
        },
        xAxis: {
          type: "time",
          axisLine: { lineStyle: { color: CHART.axis } },
          axisLabel: { color: CHART.inkMuted, fontSize: 10, hideOverlap: true },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          scale: yMin === undefined && yMax === undefined,
          min: yMin,
          max: yMax,
          axisLine: { show: false },
          axisLabel: {
            color: CHART.inkMuted,
            fontSize: 10,
            formatter: yFormatter,
          },
          splitLine: { lineStyle: { color: CHART.grid } },
        },
        series: series.map((s, si) => ({
          name: s.name,
          type: "line",
          smooth: true,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { color: s.color, width: 1.5 },
          itemStyle: { color: s.color },
          areaStyle: s.area
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${s.color}40` },
                  { offset: 1, color: `${s.color}00` },
                ]),
              }
            : undefined,
          // Shade the normal band once, attached to the first series.
          markArea:
            band && si === 0
              ? {
                  silent: true,
                  itemStyle: { color: `${CHART.ok}14` },
                  data: [[{ yAxis: band[0] }, { yAxis: band[1] }]],
                }
              : undefined,
          data: times.map((t, i) => [t ? t.getTime() : null, s.data[i]]),
        })),
      },
      true,
    );
  }, [times, series, yFormatter, yMin, yMax, band]);

  return <div ref={ref} style={{ height, width: "100%" }} />;
}
