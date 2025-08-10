import { NextRequest } from "next/server";
import { z } from "zod";

const Body = z.object({ tickers: z.array(z.string()).max(20) });

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { tickers } = Body.parse(json);

  // Mock quotes for now; could be wired to Polygon's last trade endpoint
  const items = tickers.map((t, i) => ({
    ticker: t,
    price: 50 + (t.charCodeAt(0) % 50) + (i % 7),
    change: (((t.charCodeAt(1) || 65) % 10) - 5) / 100,
  }));
  return Response.json(items);
}
