type Pt = { t: string; v: number };

export default function EquityCurve({ curve }: { curve: Pt[] }) {
  if (!curve?.length) return null;

  // Normalize to start at 1.0
  const base = curve[0].v || 1;
  const values = curve.map((p) => (p.v || 1) / (base || 1));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = 0.02;
  const yMin = Math.max(0, minV - pad);
  const yMax = maxV + pad;

  const width = 600;
  const height = 220;
  const margin = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const xFor = (i: number) =>
    margin.left + (i / Math.max(1, values.length - 1)) * chartW;
  const yFor = (v: number) =>
    margin.top + (1 - (v - yMin) / (yMax - yMin || 1)) * chartH;

  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`)
    .join(" ");

  const area = `${d} L ${margin.left + chartW} ${margin.top + chartH} L ${
    margin.left
  } ${margin.top + chartH} Z`;

  const ticks = [0, Math.floor(values.length / 2), values.length - 1].filter(
    (x, i, a) => a.indexOf(x) === i
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
      {[0, 0.5, 1].map((t, i) => {
        const y = margin.top + chartH * t;
        return (
          <line
            key={i}
            x1={margin.left}
            x2={width - margin.right}
            y1={y}
            y2={y}
            stroke="hsl(var(--muted))"
            strokeOpacity={0.2}
          />
        );
      })}

      <path d={area} fill="hsl(var(--primary))" fillOpacity={0.08} />
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />

      {ticks.map((ti) => (
        <text
          key={ti}
          x={xFor(ti)}
          y={height - 6}
          fontSize={10}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
        >
          {curve[ti]?.t?.slice(0, 10) || ""}
        </text>
      ))}

      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text
          key={i}
          x={margin.left - 8}
          y={yFor(v)}
          fontSize={10}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          dy={4}
        >
          {(v * 100).toFixed(1)}%
        </text>
      ))}
    </svg>
  );
}
