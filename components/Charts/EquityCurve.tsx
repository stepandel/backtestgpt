export default function EquityCurve({
  curve,
}: {
  curve: { t: string; v: number }[];
}) {
  const points = curve.map((p, i) => `${i},${100 - p.v * 100}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${Math.max(1, curve.length - 1)} 100`}
      className="w-full h-48 border rounded"
    >
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        points={points}
      />
    </svg>
  );
}
