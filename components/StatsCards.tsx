type Stats = {
  totalReturn: number;
  hitRate: number;
  mean: number;
  median: number;
};

export default function StatsCards({ stats }: { stats: Stats }) {
  const fmtPct = (x: number) => `${(x * 100).toFixed(2)}%`;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Total P&L</div>
        <div className="text-2xl font-semibold">
          {fmtPct(stats.totalReturn)}
        </div>
      </div>
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Hit Rate</div>
        <div className="text-2xl font-semibold">{fmtPct(stats.hitRate)}</div>
      </div>
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Mean</div>
        <div className="text-2xl font-semibold">{fmtPct(stats.mean)}</div>
      </div>
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Median</div>
        <div className="text-2xl font-semibold">{fmtPct(stats.median)}</div>
      </div>
    </div>
  );
}
