export default function Histogram({ returns }: { returns: number[] }) {
  if (!returns?.length) return null;

  let minVal = Math.min(...returns);
  let maxVal = Math.max(...returns);
  if (!isFinite(minVal) || !isFinite(maxVal)) return null;
  if (minVal === maxVal) {
    minVal -= 0.01;
    maxVal += 0.01;
  }
  minVal = Math.min(minVal, 0);
  maxVal = Math.max(maxVal, 0);
  const span = maxVal - minVal || 1;

  const bins = Math.max(6, Math.min(30, Math.round(Math.sqrt(returns.length))));
  const counts = Array.from({ length: bins }, () => 0);
  for (const r of returns) {
    const pos = (r - minVal) / span;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(pos * bins)));
    counts[idx] += 1;
  }
  const maxCount = Math.max(1, ...counts);

  const width = 600;
  const height = 220;
  const margin = { top: 10, right: 10, bottom: 28, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const barW = chartW / bins;

  const zeroX = ((0 - minVal) / span) * chartW;

  const bars = counts.map((c, i) => {
    const barH = (c / maxCount) * chartH;
    const x = margin.left + i * barW + 1;
    const y = margin.top + (chartH - barH);
    return { x, y, w: Math.max(0, barW - 2), h: barH, c };
  });

  const fmtPct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
      <rect x={0} y={0} width={width} height={height} fill="transparent" />

      {[0, 0.5, 1].map((t, i) => {
        const y = margin.top + chartH * (1 - t);
        return (
          <g key={i}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y}
              y2={y}
              stroke="hsl(var(--muted))"
              strokeOpacity={0.2}
            />
            <text
              x={margin.left - 6}
              y={y + 4}
              fontSize={10}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
            >
              {Math.round(maxCount * t)}
            </text>
          </g>
        );
      })}

      <line
        x1={margin.left + zeroX}
        x2={margin.left + zeroX}
        y1={margin.top}
        y2={margin.top + chartH}
        stroke="hsl(var(--muted))"
        strokeOpacity={0.3}
      />
      <text
        x={margin.left + zeroX}
        y={height - 6}
        fontSize={10}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
      >
        0%
      </text>

      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="hsl(var(--primary))"
          fillOpacity={0.75}
        />
      ))}

      <text
        x={margin.left}
        y={height - 6}
        fontSize={10}
        textAnchor="start"
        fill="hsl(var(--muted-foreground))"
      >
        {fmtPct(minVal)}
      </text>
      <text
        x={width - margin.right}
        y={height - 6}
        fontSize={10}
        textAnchor="end"
        fill="hsl(var(--muted-foreground))"
      >
        {fmtPct(maxVal)}
      </text>
    </svg>
  );
}
