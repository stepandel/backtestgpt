type Row = {
  ticker: string;
  entryAt: string;
  exitAt: string;
  entryPrice: number;
  exitPrice: number;
  pctReturn: number;
  days: number;
  entryUrl?: string;
  exitUrl?: string;
};

export default function Table({ rows }: { rows: Row[] }) {
  const fmtPct = (x: number) => `${(x * 100).toFixed(2)}%`;
  const fmt = (x: number) => `$${x.toFixed(2)}`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2">Ticker</th>
            <th className="py-2">Entry</th>
            <th className="py-2">Exit</th>
            <th className="py-2">Entry Px</th>
            <th className="py-2">Exit Px</th>
            <th className="py-2">Return</th>
            <th className="py-2">Days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.ticker}-${r.entryAt}`} className="border-t">
              <td className="py-2 font-medium">{r.ticker}</td>
              <td className="py-2">
                <a
                  href={r.entryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {r.entryAt}
                </a>
              </td>
              <td className="py-2">
                <a
                  href={r.exitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {r.exitAt}
                </a>
              </td>
              <td className="py-2">{fmt(r.entryPrice)}</td>
              <td className="py-2">{fmt(r.exitPrice)}</td>
              <td className="py-2">{fmtPct(r.pctReturn)}</td>
              <td className="py-2">{r.days.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
