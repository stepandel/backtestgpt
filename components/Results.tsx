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
    // Restore persisted backtest
    try {
      const saved = localStorage.getItem("backtest:data");
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
      }
    } catch {}
    function handler(e: any) {
      setData(e.detail);
      try {
        localStorage.setItem("backtest:data", JSON.stringify(e.detail));
        // Cache prices per ticker for future sessions
        const priceCacheKey = "prices:cache";
        const cache = JSON.parse(localStorage.getItem(priceCacheKey) || "{}");
        const per = e?.detail?.results?.perTicker || [];
        for (const r of per) {
          if (!cache[r.ticker]) {
            cache[r.ticker] = { lastUpdated: Date.now() };
          }
        }
        localStorage.setItem(priceCacheKey, JSON.stringify(cache));
      } catch {}
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
        <Card className="bg-zinc-950/40 backdrop-blur">
          <CardHeader>
            <CardTitle>Histogram of Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram
              returns={results.perTicker.map((t: any) => t.pctReturn)}
            />
          </CardContent>
        </Card>
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
          <Table rows={results.perTicker} />
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
