type Stats = {
  hitRate: number;
  mean: number;
  median: number;
  pos?: number;
  neg?: number;
};

export default function StatsCards({ stats }: { stats: Stats }) {
  const fmtPct = (x: number) => `${(x * 100).toFixed(2)}%`;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="rounded-md border p-4 bg-zinc-950/40 backdrop-blur">
        <div className="text-sm text-muted-foreground">Hit Rate</div>
        <div className="text-2xl font-semibold flex items-baseline gap-2">
          <span>{fmtPct(stats.hitRate)}</span>
          {typeof stats.pos === "number" && typeof stats.neg === "number" && (
            <span className="text-sm text-muted-foreground">
              ({stats.pos}/{stats.neg})
            </span>
          )}
        </div>
      </div>
      <div className="rounded-md border p-4 bg-zinc-950/40 backdrop-blur">
        <div className="text-sm text-muted-foreground">Mean P&L</div>
        <div className="text-2xl font-semibold">{fmtPct(stats.mean)}</div>
      </div>
      <div className="rounded-md border p-4 bg-zinc-950/40 backdrop-blur">
        <div className="text-sm text-muted-foreground">Median P&L</div>
        <div className="text-2xl font-semibold">{fmtPct(stats.median)}</div>
      </div>
    </div>
  );
}
