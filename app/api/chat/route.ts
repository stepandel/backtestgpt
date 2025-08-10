import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { env } from "@/lib/env";

const Msg = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const Body = z.object({ messages: z.array(Msg).min(1) });

const STAGE1_SYSTEM = `You are an interactive research assistant specializing in financial data gathering via web search.

PRIMARY GOAL
Collect a complete, accurate list of relevant tickers and their precise entry and exit points according to the user’s strategy, based ONLY on official sources.

SCOPE & CONSTRAINTS
- Time window: LAST TWO YEARS from today. Ignore older events.
- Timezone: Present all times in America/New_York (ET). If a source uses another TZ, convert to ET and note the original.
- Sources: Official ONLY — issuer Investor Relations (IR) / press releases, SEC EDGAR, stock-exchange notices/auction docs, index-provider releases (e.g., S&P DJI). If you land on an aggregator/news/blog, follow through to the official page and cite THAT.
- Clarifications: Ask the user ONLY if absolutely essential to determine deterministic entry/exit rules (max 2 short questions, one message). Otherwise make the most standard, defensible assumption and proceed.
- Cap: MAX 5 tickers. Stop when you have 5 valid items.
- Minimize chatter: Reason briefly but concretely; cite every data point.

OUTPUT REQUIREMENTS (MARKDOWN — NOT JSON)
For each ticker, write a section exactly in this format:

### TICKER: <Symbol>

**Reasoning**
- Search terms: "<exact terms used>"
- Why this source: "<why the chosen official page is authoritative>"
- Cross-checks: "<what you compared/verified>"
- Timing notes: "<any TZ conversion, ‘date-only’, or edge-case considerations>"

**Result**
- Entry: <specific entry criterion> — <ET timestamp if available; otherwise “date-only”>
- Exit: <specific exit criterion> — <ET timestamp if available; otherwise “date-only”>

**Official sources**
- <Publisher name>: <URL>
- <Publisher name>: <URL>

RULES
- Always show **Reasoning** first, then **Result**, then **Official sources**.
- Every Result line must be backed by an official source listed below it.
- If a precise timestamp isn’t present in the official text, label it “date-only” and explain in Timing notes.
- If either leg (entry or exit) lacks an official source, DROP the ticker.
- Never exceed 5 tickers in total.

END STATE
- When you’ve collected everything you need, add a final line (on its own):
Ready to finalize plan

CLARIFYING QUESTION FORMAT (ONLY IF ESSENTIAL)
- Ask up to two, as bullet points at the very top, then stop and wait:
- “Confirm exit: closing auction on the effective date, or official daily close?”
- “Use all additions within the last two years, or restrict to tickers you name?”

DO NOT:
- Do not output JSON.
- Do not include tables or extra sections.
- Do not repeat boilerplate between tickers beyond the required structure.
`;

export async function POST(req: NextRequest) {
  if (!env.OPENAI_API_KEY) {
    return new Response("Set OPENAI_API_KEY to enable research chat.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const json = await req.json();
  const { messages } = Body.parse(json);

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const stream = await client.responses.stream({
    model: "gpt-5",
    tools: [{ type: "web_search_preview" }],
    input: [{ role: "system", content: STAGE1_SYSTEM }, ...messages],
    text: { verbosity: "low" },
    reasoning: {
      effort: "low",
    },
  });

  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
          try {
            stream.done();
          } catch {}
        }
      };
      const safeError = (e: any) => {
        if (!closed) {
          closed = true;
          try {
            controller.error(e);
          } catch {}
          try {
            stream.done();
          } catch {}
        }
      };

      stream.on("event", (evt: any) => {
        console.log("evt", evt);
        // Output text deltas → pass through
        if (
          evt?.type === "response.output_text.delta" &&
          typeof evt.delta === "string" &&
          !closed
        ) {
          try {
            controller.enqueue(encoder.encode(evt.delta));
          } catch {}
        }
        // Reasoning deltas → tag for client-side ephemeral display
        if (
          evt?.type === "response.reasoning.delta" &&
          typeof evt.delta === "string" &&
          !closed
        ) {
          try {
            controller.enqueue(encoder.encode(`[[R]]${evt.delta}`));
          } catch {}
        }
        // Reasoning lifecycle markers via output_item events
        if (
          evt?.type === "response.output_item.added" &&
          evt?.item?.type === "reasoning" &&
          !closed
        ) {
          try {
            controller.enqueue(encoder.encode("[[R:BEGIN]]"));
          } catch {}
        }
        if (
          evt?.type === "response.output_item.done" &&
          evt?.item?.type === "reasoning" &&
          !closed
        ) {
          try {
            controller.enqueue(encoder.encode("[[R:END]]"));
          } catch {}
        }
        // Web search lifecycle and status
        if (
          evt?.type === "response.output_item.added" &&
          evt?.item?.type === "web_search_call" &&
          !closed
        ) {
          try {
            controller.enqueue(encoder.encode("[[S:BEGIN]]"));
          } catch {}
        }
        if (evt?.type === "response.web_search_call.in_progress" && !closed) {
          try {
            controller.enqueue(encoder.encode("[[S:STATUS:in_progress]]"));
          } catch {}
        }
        if (evt?.type === "response.web_search_call.searching" && !closed) {
          try {
            controller.enqueue(encoder.encode("[[S:STATUS:searching]]"));
          } catch {}
        }
        if (evt?.type === "response.web_search_call.completed" && !closed) {
          try {
            controller.enqueue(encoder.encode("[[S:STATUS:completed]]"));
          } catch {}
        }
        if (
          evt?.type === "response.output_item.done" &&
          evt?.item?.type === "web_search_call" &&
          !closed
        ) {
          try {
            const query = evt?.item?.action?.query;
            if (typeof query === "string" && query.length > 0) {
              controller.enqueue(encoder.encode(`[[S:QUERY]]${query}`));
            }
            controller.enqueue(encoder.encode("[[S:END]]"));
          } catch {}
        }
        if (
          evt?.type === "response.completed" ||
          evt?.type === "response.error"
        ) {
          safeClose();
        }
      });
      stream.on("error", (e: any) => safeError(e));
    },
    cancel() {
      try {
        stream.done();
      } catch {}
    },
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
