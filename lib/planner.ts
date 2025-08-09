import { env } from "@/lib/env";

export type PlanItem = {
  ticker: string;
  entry: { at: string | null; source: string; url: string };
  exit: { at: string | null; source: string; url: string };
};
export type Plan = PlanItem[];

// Simulated GPT-5 planner calling a custom tool `officialEventExtractor`.
// In production, replace with OpenAI API function calling. For demo, we craft a minimal plausible Plan.
export async function createPlanFromPrompt(prompt: string): Promise<Plan> {
  // For demo: extract tickers heuristically and fabricate dates + official links.
  // If prompt mentions S&P 500 addition, use a known example (e.g., TSLA 2020-12-21 added to S&P 500).
  const lower = prompt.toLowerCase();
  if (
    lower.includes("s&p") ||
    lower.includes("sp500") ||
    lower.includes("s&p 500")
  ) {
    return [
      {
        ticker: "KDP",
        entry: {
          at: "2024-06-07T17:15:00-04:00", // official timestamp from press release
          source: "S&P DJI press release",
          url: "https://press.spglobal.com/2024-06-07-S-P-Dow-Jones-Indices-Announces-Quarterly-Rebalance-of-the-S-P-500-and-Other-Indices",
        },
        exit: {
          at: "2024-06-24T16:00:00-04:00", // NYSE closing auction
          source: "Exchange closing auction spec (NYSE)",
          url: "https://www.nyse.com/auctions",
        },
      },
    ];
  }

  // Generic fallback single ticker demo
  return [
    {
      ticker: "AAPL",
      entry: {
        at: null,
        source: "date-only",
        url: "https://investor.apple.com/",
      },
      exit: {
        at: null,
        source: "date-only",
        url: "https://investor.apple.com/",
      },
    },
  ];
}
