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

    // Entry rule: if timestamp is same-day premarket/unknown, use that day open; otherwise use next day open.
    const entryDate = item.entry.at
      ? new Date(item.entry.at)
      : new Date(series[0].t);
    const entryDayISO = new Date(entryDate.toISOString().slice(0, 10));
    const entryIdx = series.findIndex(
      (b) => b.t.slice(0, 10) === entryDayISO.toISOString().slice(0, 10)
    );
    const effectiveEntryIdx = Math.max(0, entryIdx);
    const entryBar = series[effectiveEntryIdx];
    const entryPrice = entryBar.o;

    // Exit rule: use that day's close. If exit earlier than entry, skip.
    const exitDate = item.exit.at
      ? new Date(item.exit.at)
      : new Date(series[series.length - 1].t);
    const exitDayISO = new Date(exitDate.toISOString().slice(0, 10));
    let exitIdx = series.findIndex(
      (b) => b.t.slice(0, 10) === exitDayISO.toISOString().slice(0, 10)
    );
    if (exitIdx < effectiveEntryIdx) continue;
    if (exitIdx === -1) exitIdx = series.length - 1;
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
