import { determineDailyExecution, type Execution } from "@/engine/strategy";
import { getHourlyBars, getDailyBars } from "@/lib/prices";
import type { Plan } from "@/lib/planner";

export async function runBacktest(plan: Plan) {
  const tickers = Array.from(new Set(plan.map((p) => p.ticker)));
  const minEntry = plan.reduce<string | null>((acc, p) => {
    const at = p.entry.at;
    if (!at) return acc;
    if (!acc) return at;
    return at < acc ? at : acc;
  }, null);
  const maxExit = plan.reduce<string | null>((acc, p) => {
    const at = p.exit.at;
    if (!at) return acc;
    if (!acc) return at;
    return at > acc ? at : acc;
  }, null);

  // Use date-only strings (YYYY-MM-DD) as before to satisfy Polygon aggregates requirements
  const from = (minEntry ?? "2019-01-01T00:00:00Z").slice(0, 10);
  const to = (maxExit ?? new Date().toISOString()).slice(0, 10);

  const prices: Record<string, Awaited<ReturnType<typeof getHourlyBars>>> = {};
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const hrs = await getHourlyBars(t, from, to);
        prices[t] = hrs.length ? hrs : await getDailyBars(t, from, to);
      } catch {
        prices[t] = await getDailyBars(t, from, to);
      }
    })
  );

  const perTicker = determineDailyExecution(plan, prices);

  const positiveCount = perTicker.filter((r) => r.pctReturn > 0).length;
  const negativeCount = perTicker.length - positiveCount;
  const hitRate = perTicker.length ? positiveCount / perTicker.length : 0;
  const sorted = [...perTicker].map((r) => r.pctReturn).sort((a, b) => a - b);
  const mean = perTicker.length
    ? sorted.reduce((a, b) => a + b, 0) / perTicker.length
    : 0;
  const median = perTicker.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  // More granular equity curve from cumulative average of per-ticker returns distributed equally
  const steps = Math.max(1, prices[tickers[0]]?.length || perTicker.length);
  const curve: { t: string; v: number }[] = [];
  let value = 1;
  for (let i = 0; i < steps; i++) {
    const stepRet = perTicker.length
      ? perTicker.reduce((s, r) => s + r.pctReturn / steps, 0)
      : 0;
    value += stepRet;
    curve.push({ t: String(i), v: value });
  }

  return {
    perTicker,
    stats: { hitRate, mean, median, pos: positiveCount, neg: negativeCount },
    equityCurve: curve,
  };
}
