"use client";

import ResultsView from "@/components/ResultsView";
import { MOCK_EQUITY_CURVE } from "@/lib/mockCurve";
import { useBacktestData } from "@/hooks/useBacktestData";

export default function Results() {
  const data = useBacktestData();

  if (!data) return null;

  const { plan, results } = data;
  // Transform results to match ResultsView expected format
  const demoResults = { 
    stats: {
      hitRate: results.stats.winRate,
      mean: results.stats.avgWin,
      median: results.stats.avgLoss,
      pos: results.stats.trades,
      neg: results.stats.trades - Math.round(results.stats.trades * results.stats.winRate)
    },
    equityCurve: MOCK_EQUITY_CURVE,
    perTicker: results.perTicker 
  };

  return (
    <div className="space-y-6">
      <ResultsView plan={plan} results={demoResults} />
    </div>
  );
}
