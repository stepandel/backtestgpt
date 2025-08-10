import StatsCards from "@/components/StatsCards";
import EquityCurve from "@/components/Charts/EquityCurve";
import Table from "@/components/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ResultsData = {
  stats: {
    hitRate: number;
    mean: number;
    median: number;
    pos?: number;
    neg?: number;
  };
  equityCurve: { t: string; v: number }[];
  perTicker: any[];
};

export default function ResultsView({
  plan,
  results,
}: {
  plan: any[];
  results: ResultsData;
}) {
  return (
    <div className="space-y-6">
      <StatsCards stats={results.stats} />
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-zinc-950/40 backdrop-blur">
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurve curve={results.equityCurve} />
          </CardContent>
        </Card>
      </div>
      <Card className="bg-zinc-950/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Per-Ticker Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table rows={results.perTicker as any} />
        </CardContent>
      </Card>
      <Card className="bg-zinc-950/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Citations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {plan
              .flatMap((p: any) => [p.entry?.url, p.exit?.url])
              .filter(Boolean)
              .map((u: string, idx: number) => (
                <li key={idx}>
                  <a
                    className="underline"
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {u}
                  </a>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
