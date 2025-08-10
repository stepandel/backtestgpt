import { useEffect, useMemo, useRef, useState } from "react";

type Pt = { t: string; v: number };

type Props = {
  curve: Pt[];
  entryIndex?: number;
  exitIndex?: number;
  onOffsetsChange?: (entryIndex: number, exitIndex: number) => void;
};

export default function EquityCurve({
  curve,
  entryIndex,
  exitIndex,
  onOffsetsChange,
}: Props) {
  if (!curve?.length) return null;

  // Normalize to start at 1.0
  const base = curve[0].v || 1;
  const values = curve.map((p) => (p.v || 1) / (base || 1));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = 0.02;
  const yMin = Math.max(0, minV - pad);
  const yMax = maxV + pad;

  // Use container width by matching the rendered client width on first render
  const [clientW, setClientW] = useState<number>(600);
  const [clientH, setClientH] = useState<number>(220);
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setClientW(Math.max(300, cr.width));
        setClientH(Math.max(180, cr.height));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = clientW;
  const height = clientH;
  // Increase left margin to prevent y-axis labels from bleeding outside
  const margin = { top: 10, right: 10, bottom: 24, left: 64 };
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

  const isControlled =
    typeof entryIndex === "number" && typeof exitIndex === "number";
  const [startIdx, setStartIdx] = useState<number>(
    isControlled ? Math.min(entryIndex!, exitIndex!) : 0
  );
  const [endIdx, setEndIdx] = useState<number>(
    isControlled ? Math.max(entryIndex!, exitIndex!) : values.length - 1
  );
  const draggingRef = useRef<null | "start" | "end">(null);

  useEffect(() => {
    if (isControlled) {
      setStartIdx(Math.min(entryIndex!, exitIndex!));
      setEndIdx(Math.max(entryIndex!, exitIndex!));
    }
  }, [entryIndex, exitIndex, isControlled]);

  function clampIndex(i: number) {
    return Math.max(0, Math.min(values.length - 1, i));
  }

  function indexForX(clientX: number, svgEl: SVGSVGElement | null) {
    if (!svgEl) return 0;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = rect.width / width;
    const renderedMarginLeft = margin.left * scaleX;
    const renderedChartW = chartW * scaleX;
    let x = clientX - rect.left;
    // Clamp to chart drawing area in rendered pixels
    x = Math.max(
      renderedMarginLeft,
      Math.min(renderedMarginLeft + renderedChartW, x)
    );
    const rel = (x - renderedMarginLeft) / (renderedChartW || 1);
    return clampIndex(Math.round(rel * (values.length - 1)));
  }

  const startX = xFor(startIdx);
  const endX = xFor(endIdx);

  // svgRef declared above

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
    // Choose handle by pixel proximity to avoid index rounding artifacts
    const rect = svgRef.current?.getBoundingClientRect();
    const scaleX = rect ? rect.width / width : 1;
    const pxX = rect ? e.clientX - rect.left : 0;
    const startPx = xFor(startIdx) * scaleX;
    const endPx = xFor(endIdx) * scaleX;
    const distStartPx = Math.abs(pxX - startPx);
    const distEndPx = Math.abs(pxX - endPx);
    draggingRef.current = distStartPx <= distEndPx ? "start" : "end";
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    const idx = indexForX(e.clientX, svgRef.current);
    if (draggingRef.current === "start") {
      const next = Math.min(idx, endIdx);
      if (!isControlled) setStartIdx(next);
      onOffsetsChange?.(next, endIdx);
    } else {
      const next = Math.max(idx, startIdx);
      if (!isControlled) setEndIdx(next);
      onOffsetsChange?.(startIdx, next);
    }
  }

  function onPointerUp(e?: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = null;
    if (e) {
      try {
        (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-64 cursor-crosshair select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
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

      {/* Selected window shading */}
      <rect
        x={Math.min(startX, endX)}
        y={margin.top}
        width={Math.max(2, Math.abs(endX - startX))}
        height={chartH}
        fill="hsl(var(--primary))"
        fillOpacity={0.06}
      />

      {/* Start handle */}
      <line
        x1={startX}
        x2={startX}
        y1={margin.top}
        y2={margin.top + chartH}
        stroke="hsl(var(--primary))"
        strokeOpacity={0.6}
      />
      <circle
        cx={startX}
        cy={yFor(values[startIdx])}
        r={5}
        fill="hsl(var(--primary))"
      />

      {/* End handle */}
      <line
        x1={endX}
        x2={endX}
        y1={margin.top}
        y2={margin.top + chartH}
        stroke="hsl(var(--primary))"
        strokeOpacity={0.6}
      />
      <circle
        cx={endX}
        cy={yFor(values[endIdx])}
        r={5}
        fill="hsl(var(--primary))"
      />

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
