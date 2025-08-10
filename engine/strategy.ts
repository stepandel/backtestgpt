import type { Plan } from "@/lib/planner";
import type { Bar } from "@/lib/prices";

export type Execution = {
  ticker: string;
  entryAt: string;
  exitAt: string;
  entryPrice: number;
  exitPrice: number;
  pctReturn: number;
  days: number;
};

export function determineDailyExecution(
  plan: Plan,
  prices: Record<string, Bar[]>
): Execution[] {
  const executions: Execution[] = [];
  for (const item of plan) {
    const series = prices[item.ticker] || [];
    if (!series.length) continue;

    // Entry: first bar on or after the entry day (UTC day match)
    const entryDate = item.entry.at
      ? new Date(item.entry.at)
      : new Date(series[0].t);
    const entryDayUTC = entryDate.toISOString().slice(0, 10);
    let effectiveEntryIdx = series.findIndex(
      (b) => b.t.slice(0, 10) >= entryDayUTC
    );
    if (effectiveEntryIdx === -1) effectiveEntryIdx = 0;
    const entryBar = series[effectiveEntryIdx];
    const entryPrice = entryBar.o;

    // Exit: last bar on or before exit day (UTC day match)
    const exitDate = item.exit.at
      ? new Date(item.exit.at)
      : new Date(series[series.length - 1].t);
    const exitDayUTC = exitDate.toISOString().slice(0, 10);
    let exitIdx = -1;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].t.slice(0, 10) <= exitDayUTC) {
        exitIdx = i;
        break;
      }
    }
    if (exitIdx === -1) exitIdx = series.length - 1;
    if (exitIdx < effectiveEntryIdx) continue;
    const exitBar = series[exitIdx];
    const exitPrice = exitBar.c;

    const pctReturn = (exitPrice - entryPrice) / entryPrice;
    const days =
      (new Date(exitBar.t).getTime() - new Date(entryBar.t).getTime()) / 8.64e7;
    executions.push({
      ticker: item.ticker,
      entryAt: entryBar.t,
      exitAt: exitBar.t,
      entryPrice,
      exitPrice,
      pctReturn,
      days,
    });
  }
  return executions;
}
