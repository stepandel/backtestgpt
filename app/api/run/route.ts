import { NextRequest } from "next/server";
import { z } from "zod";
import type { Plan } from "@/lib/planner";
import { runBacktest } from "@/engine/compute";

const Entry = z.object({
  at: z.string().nullable(),
  source: z.string(),
  url: z.string().url(),
});
const Item = z.object({ ticker: z.string(), entry: Entry, exit: Entry });
const Body = z.object({ plan: z.array(Item) });

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { plan } = Body.parse(json);
  const results = await runBacktest(plan as Plan);
  // Shape per-ticker rows with URLs for table
  const perTicker = results.perTicker.map((r) => {
    const p = (plan as Plan).find((x) => x.ticker === r.ticker)!;
    return { ...r, entryUrl: p.entry.url, exitUrl: p.exit.url };
  });
  return Response.json({ ...results, perTicker });
}
