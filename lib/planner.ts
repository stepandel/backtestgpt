import { env } from "@/lib/env";
import OpenAI from "openai";

export type PlanItem = {
  ticker: string;
  entry: { at: string | null; source: string; url: string };
  exit: { at: string | null; source: string; url: string };
};
export type Plan = PlanItem[];

export const OFFICIAL_EVENT_TOOL = {
  name: "officialEventExtractor",
  type: "function",
  description:
    "Extracts trading plan data from a user strategy prompt, enriched with official source dates for entry/exit.",
  parameters: {
    type: "object",
    properties: {
      plan: {
        type: "array",
        description:
          "Array of tickers with official entry/exit data for backtesting.",
        items: {
          type: "object",
          properties: {
            ticker: {
              type: "string",
              description: "Stock ticker symbol.",
            },
            entry: {
              type: "object",
              properties: {
                at: {
                  type: ["string", "null"],
                  description:
                    "Entry timestamp in ISO8601 format, or null if only date is known.",
                },
                source: {
                  type: "string",
                  description:
                    "Description of source timing precision (e.g., 'official-press-release', 'date-only').",
                },
                url: {
                  type: "string",
                  description: "Official source URL for the entry event.",
                },
              },
              required: ["at", "source", "url"],
            },
            exit: {
              type: "object",
              properties: {
                at: {
                  type: ["string", "null"],
                  description:
                    "Exit timestamp in ISO8601 format, or null if only date is known.",
                },
                source: {
                  type: "string",
                  description: "Description of source timing precision.",
                },
                url: {
                  type: "string",
                  description: "Official source URL for the exit event.",
                },
              },
              required: ["at", "source", "url"],
            },
          },
          required: ["ticker", "entry", "exit"],
        },
      },
    },
    required: ["plan"],
  },
} as const;

const SYSTEM_PROMPT = `You are an event-to-trading-plan extraction agent.

OBJECTIVE
From a user’s free-form trading strategy, produce a structured plan of {ticker, entry, exit} items suitable for deterministic backtesting.

RESPONSE FORMAT (MANDATORY)
- You must respond ONLY by calling the tool "officialEventExtractor" with a single argument:
  { "plan": PlanItem[] }
- DO NOT output any natural language or ask follow-up questions.
- If nothing qualifies, return { "plan": [] }.

TIME WINDOW (FIXED)
- Consider only events whose entry and exit both fall within the LAST TWO YEARS from “today”.
- If an event spans beyond that window, exclude it.

TIMEZONE (FIXED)
- All timestamps must be in America/New_York (ET) and ISO8601 (include offset). Example: 2024-06-07T17:15:00-04:00.

ENTRY/EXIT INTERPRETATION
- The user prompt will always include requirements for entry and requirements for exit (explicitly or implicitly).
- Parse those requirements. If ambiguous, choose the most standard, widely-accepted interpretation consistent with the text and proceed WITHOUT ASKING CLARIFYING QUESTIONS.
- If you cannot determine a defensible, official timestamp for a leg, EXCLUDE that ticker rather than guessing.

OFFICIAL SOURCES (REQUIRED)
- Use ONLY official sources to determine dates/times:
  • Company Investor Relations (press releases)  
  • SEC EDGAR filings (8-K, 6-K, etc.)  
  • Stock exchange notices / auction documentation  
  • Index provider press releases (e.g., S&P Dow Jones Indices)  
- DISALLOWED: blogs, news summaries, social posts, aggregators without original official links.
- Each leg (entry/exit) must include a URL to the official source used.
- If the official source provides only a date (no time), set at = null and source = "date-only".

OUTPUT SCHEMA
PlanItem = {
  ticker: string,
  entry: { at: string | null, source: string, url: string },
  exit:  { at: string | null, source: string, url: string }
}
Tool argument = { plan: PlanItem[] }

RULES OF ENGAGEMENT
- Never ask the user for more details. Apply defaults above and proceed.
- Prefer precise timestamps found in the official text. If not present, use date-only (at = null).
- If multiple official sources conflict, select the most authoritative (issuer or primary authority) and continue.
- Exclude any ticker where you cannot cite an official source for BOTH legs consistent with the user’s entry/exit requirements.
- Keep ticker symbols as listed on primary U.S. exchanges when applicable.

EXAMPLES (ILLUSTRATIVE ONLY)
- S&P 500 additions: entry = official index-provider announcement timestamp; exit = primary exchange closing auction time on the effective date (cite exchange auction spec). If announcement lists date-only, entry.at = null with source = "date-only".
- Earnings strategies: entry = company IR press release/8-K timestamp; exit = next day official close (exchange site) if specified by user, otherwise as requested.

FINAL CHECK
- Are all items within the last two years? If not, drop them.
- Are all timestamps ET and ISO8601 (or null for date-only)? If not, fix them.
- Are all URLs official? If not, drop the item.

Now, perform any necessary web search internally, build the plan, and RESPOND ONLY by calling tool "officialEventExtractor" with:
{ "plan": [...] }`;

export async function createPlanFromPrompt(prompt: string): Promise<Plan> {
  // Demo fallback when no OpenAI key is present
  if (!env.OPENAI_API_KEY) {
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
            at: "2024-06-07T17:15:00-04:00",
            source: "S&P DJI press release",
            url: "https://press.spglobal.com/2024-06-07-S-P-Dow-Jones-Indices-Announces-Quarterly-Rebalance-of-the-S-P-500-and-Other-Indices",
          },
          exit: {
            at: "2024-06-24T16:00:00-04:00",
            source: "Exchange closing auction spec (NYSE)",
            url: "https://www.nyse.com/auctions",
          },
        },
      ];
    }
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

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  try {
    const response: any = await client.responses.create({
      model: "gpt-5",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      tools: [{ type: "web_search_preview" }, OFFICIAL_EVENT_TOOL as any],
      // tool_choice: { type: "function", name: "officialEventExtractor" },
    });

    console.log("response", response);
    const outputs: any[] = response.output ?? [];
    const toolCallItem = outputs.find(
      (o: any) => o.type === "tool_call" && o.name === "officialEventExtractor"
    );
    if (toolCallItem?.arguments) {
      return JSON.parse(toolCallItem.arguments) as Plan;
    }

    const choiceToolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (
      choiceToolCall?.function?.name === "officialEventExtractor" &&
      typeof choiceToolCall.function.arguments === "string"
    ) {
      return JSON.parse(choiceToolCall.function.arguments) as Plan;
    }

    throw new Error("No officialEventExtractor tool call found in response");
  } catch (err: any) {
    throw new Error(
      `Planner failed using gpt-5 with web_search_preview: ${
        err?.message || err
      }`
    );
  }
}
