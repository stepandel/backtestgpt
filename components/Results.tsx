"use client";

import { useEffect, useState } from "react";
import StatsCards from "@/components/StatsCards";
import Histogram from "@/components/Charts/Histogram";
import EquityCurve from "@/components/Charts/EquityCurve";
import Table from "@/components/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Results() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    function handler(e: any) {
      setData(e.detail);
    }
    window.addEventListener("backtest:results", handler);
    return () => window.removeEventListener("backtest:results", handler);
  }, []);

  if (!data) return null;

  const { plan, results } = data;

  return (
    <div className="space-y-6">
      <StatsCards stats={results.stats} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Histogram of Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram
              returns={results.perTicker.map((t: any) => t.pctReturn)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurve curve={results.equityCurve} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Per-Ticker Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table rows={results.perTicker} />
        </CardContent>
      </Card>
      <Card>
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
