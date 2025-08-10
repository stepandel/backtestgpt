import { env, isDemo } from "@/lib/env";
import { restClient } from "@polygon.io/client-js";

export type Bar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

async function fetchPolygonDaily(
  ticker: string,
  from: string,
  to: string
): Promise<Bar[]> {
  const client = restClient(env.POLYGON_API_KEY || "") as any;
  const resp = await client.getStocksAggregates(ticker, 1, "day", from, to, {
    adjusted: true,
    sort: "asc",
    limit: 5000,
  });
  const results: any[] = (resp as any).results || [];
  return results.map((r: any) => ({
    t: new Date(r.t).toISOString(),
    o: r.o,
    h: r.h,
    l: r.l,
    c: r.c,
    v: r.v,
  }));
}

// Simple mock generator: deterministic sine/random walk
function mockDailySeries(ticker: string, from: string, to: string): Bar[] {
  const start = new Date(from);
  const end = new Date(to);
  const days: Bar[] = [];
  let price = 100 + (ticker.charCodeAt(0) % 20);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const drift = Math.sin(d.getTime() / 8.64e7) * 0.5;
    const shock = ((d.getDate() * 13 + d.getMonth() * 7) % 5) * 0.1 - 0.2;
    const ret = drift + shock;
    const o = price;
    price = Math.max(1, price * (1 + ret / 100));
    const c = price;
    const h = Math.max(o, c) * (1 + 0.003);
    const l = Math.min(o, c) * (1 - 0.003);
    days.push({
      t: new Date(d).toISOString().slice(0, 10) + "T20:00:00Z",
      o,
      h,
      l,
      c,
      v: 1000000,
    });
  }
  return days;
}

async function fetchPolygonAgg(
  ticker: string,
  from: string,
  to: string,
  multiplier: number,
  timespan: "day" | "hour"
): Promise<Bar[]> {
  const client = restClient(env.POLYGON_API_KEY || "") as any;
  const resp = await client.getStocksAggregates(
    ticker,
    multiplier,
    timespan,
    from,
    to,
    { adjusted: true, sort: "asc", limit: 5000 }
  );
  const results: any[] = (resp as any).results || [];
  return results.map((r: any) => ({
    t: new Date(r.t).toISOString(),
    o: r.o,
    h: r.h,
    l: r.l,
    c: r.c,
    v: r.v,
  }));
}

function mockHourlySeries(ticker: string, from: string, to: string): Bar[] {
  const startD = new Date(from);
  const endD = new Date(to);
  const hours: Bar[] = [];
  let price = 100 + (ticker.charCodeAt(0) % 20);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    for (let h = 10; h <= 16; h++) {
      const ts = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h)
      );
      const drift = Math.sin(ts.getTime() / 3.6e6) * 0.2;
      const shock =
        ((ts.getUTCHours() * 17 + ts.getUTCDate() * 7) % 9) * 0.05 - 0.2;
      const ret = drift + shock;
      const o = price;
      price = Math.max(1, price * (1 + ret / 100));
      const c = price;
      const hi = Math.max(o, c) * 1.002;
      const lo = Math.min(o, c) * 0.998;
      hours.push({ t: ts.toISOString(), o, h: hi, l: lo, c, v: 10000 });
    }
  }
  return hours;
}

export async function getHourlyBars(
  ticker: string,
  from: string,
  to: string
): Promise<Bar[]> {
  if (isDemo) return mockHourlySeries(ticker, from, to);
  return fetchPolygonAgg(ticker, from, to, 1, "hour");
}

export async function getDailyBars(
  ticker: string,
  from: string,
  to: string
): Promise<Bar[]> {
  if (isDemo) return mockDailySeries(ticker, from, to);
  return fetchPolygonAgg(ticker, from, to, 1, "day");
}
