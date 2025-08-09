export default function Histogram({ returns }: { returns: number[] }) {
  const bins = 20;
  const min = Math.min(...returns, 0);
  const max = Math.max(...returns, 0);
  const width = max - min || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const r of returns) {
    const idx = Math.min(
      bins - 1,
      Math.max(0, Math.floor(((r - min) / width) * bins))
    );
    counts[idx]++;
  }
  const maxCount = Math.max(...counts, 1);
  return (
    <div className="h-48 flex items-end gap-1">
      {counts.map((c, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/70"
          style={{ height: `${(c / maxCount) * 100}%` }}
        />
      ))}
    </div>
  );
}
