import { env, isDemo } from "@/lib/env";

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
  const url = new URL(
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`
  );
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "5000");
  url.searchParams.set("apiKey", env.POLYGON_API_KEY!);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Polygon daily request failed");
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
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

export async function getDailyBars(
  ticker: string,
  from: string,
  to: string
): Promise<Bar[]> {
  if (isDemo) return mockDailySeries(ticker, from, to);
  return fetchPolygonDaily(ticker, from, to);
}
