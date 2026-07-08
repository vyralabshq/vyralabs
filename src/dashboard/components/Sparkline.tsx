// Tiny inline-SVG trend line for stat panels. Lightweight (no chart lib per panel);
// the big ECharts charts are separate. Missing points are skipped, not zeroed.

export function Sparkline({
  data,
  width = 96,
  height = 28,
  strokeClass = "text-accent",
}: {
  data: (number | null)[];
  width?: number;
  height?: number;
  strokeClass?: string;
}) {
  const pts = data
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);

  if (pts.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const values = pts.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = data.length - 1;

  const coords = pts.map((p) => {
    const x = (p.i / n) * width;
    const y = height - ((p.v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={strokeClass}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={area} fill="currentColor" opacity={0.1} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
