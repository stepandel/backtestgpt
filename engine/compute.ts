import { determineDailyExecution, type Execution } from "@/engine/strategy";
import { getDailyBars } from "@/lib/prices";
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

  const from = (minEntry ?? "2019-01-01T00:00:00Z").slice(0, 10);
  const to = (maxExit ?? new Date().toISOString()).slice(0, 10);

  const prices: Record<string, Awaited<ReturnType<typeof getDailyBars>>> = {};
  await Promise.all(
    tickers.map(async (t) => {
      prices[t] = await getDailyBars(t, from, to);
    })
  );

  const perTicker = determineDailyExecution(plan, prices);

  const totalReturn = perTicker.reduce((s, r) => s + r.pctReturn, 0);
  const hitRate = perTicker.length
    ? perTicker.filter((r) => r.pctReturn > 0).length / perTicker.length
    : 0;
  const sorted = [...perTicker].map((r) => r.pctReturn).sort((a, b) => a - b);
  const mean = perTicker.length
    ? sorted.reduce((a, b) => a + b, 0) / perTicker.length
    : 0;
  const median = perTicker.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const equityCurve = perTicker.map((r, i) => ({
    t: String(i),
    v: 1 + perTicker.slice(0, i + 1).reduce((s, x) => s + x.pctReturn, 0),
  }));

  return {
    perTicker,
    stats: { totalReturn, hitRate, mean, median },
    equityCurve,
  };
}
