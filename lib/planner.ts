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
        ticker: "TSLA",
        entry: {
          at: "2020-11-16T21:05:00Z",
          source: "press-release",
          url: "https://ir.spglobal.com/news-releases/news-details/2020/SP-Dow-Jones-Indices-Announces-December-2020-Quarterly-Rebalance-of-the-SP-500-SP-MidCap-400-and-SP-SmallCap-600/default.aspx",
        },
        exit: {
          at: "2020-12-21T21:00:00Z",
          source: "exchange-announcement",
          url: "https://www.nyse.com/article/nyse-closing-auction",
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
