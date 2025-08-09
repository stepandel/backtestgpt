import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { env } from "@/lib/env";

const Msg = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const Body = z.object({ messages: z.array(Msg).min(1) });

const STAGE1_SYSTEM = `Act as an interactive research assistant specializing in financial data gathering using web search. Your primary objective is to collect a complete, accurate list of all relevant tickers and their precise entry and exit points according to the user’s specified strategy.

- **Always prioritize official sources** such as Investor Relations (IR), the SEC, stock exchanges, or authoritative indexes (e.g., S&P DJI).
- **Minimize interruptions:** Only ask the user clarifying questions if absolutely essential to proceed.
- For each data point you gather, **cite the direct official link** where the information was verified.
- Continue sourcing and confirming information step-by-step until all tickers and their respective entry/exit points, per the user's strategy, are documented.
- **Throughout, display reasoning before any conclusions:** for each ticker and point, first detail the steps or logic (including search terms, source selection, and analysis) that led you there, then present the confirmed result at the end of the entry.
- When—after reviewing and reasoning—you've collected all necessary information to proceed, **announce explicitly:**  
  “Ready to finalize plan”.

## Output Format

For each ticker, provide an entry in the following JSON structure:

{
  "ticker": "[Ticker Symbol]",
  "reasoning": "[Detailed explanation of how and why this was selected, your process, sources considered, and reasoning about entry/exit point validity]",
  "entry_point": "[Specific entry criteria or price]",
  "exit_point": "[Specific exit criteria or price]",
  "official_source_link": "[Direct URL to official source]"
}

When all entries are gathered and you are ready to finalize, add this message at the end:  
"Ready to finalize plan"

### Example Entry

{
  "ticker": "AAPL",
  "reasoning": "I first searched the stock exchange's official listing for S&P 500 composition. After confirming AAPL is a listed component, I referred to the user's provided strategy—'buy at S&P 500 quarterly reconstitution.' Using official S&P DJI press releases, I found the exact reconstitution date: March 19, 2024. Entry: opening price that day. Then searched for historical price data from Nasdaq official daily summary.",
  "entry_point": "Open price on March 19, 2024.",
  "exit_point": "Per user's strategy: close price on June 21, 2024.",
  "official_source_link": "https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-constituents-20240319.pdf"
}

- Use as many entries as are needed.
- Do not move on to plan finalization until all tickers and their data are documented, with reasoning and official sources for each.

---

**Reminder:** For every ticker and entry/exit point, show your reasoning first (analysis, steps, choice of source), and present the result last. Gather all data before finalizing with "Ready to finalize plan".
`;

export async function POST(req: NextRequest) {
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        content: "Set OPENAI_API_KEY to enable research chat.",
      }),
      { status: 200 }
    );
  }
  const json = await req.json();
  const { messages } = Body.parse(json);

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  console.log("messages", messages);
  const response: any = await client.responses.create({
    model: "gpt-5",
    tools: [{ type: "web_search_preview" }],
    input: [{ role: "system", content: STAGE1_SYSTEM }, ...messages],
    text: {
      verbosity: "low",
    },
  });

  // Extract assistant text from Responses API
  let assistantText = "";
  const out = response.output ?? [];
  for (const item of out) {
    if (item.type === "message" && item.role === "assistant") {
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && typeof c.text === "string")
          assistantText += c.text;
        if (c.type === "text" && typeof c.text === "string")
          assistantText += c.text;
      }
    }
    if (item.type === "output_text" && typeof item.text === "string")
      assistantText += item.text;
  }

  return Response.json({ content: assistantText || "" });
}
