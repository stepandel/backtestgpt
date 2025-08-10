import { env } from "@/lib/env";
import OpenAI from "openai";

export type PlanItem = {
  ticker: string;
  entry: { at: string; source?: string; url?: string };
  exit: { at: string; source?: string; url?: string };
};
export type Plan = PlanItem[];

export const OFFICIAL_EVENT_TOOL = {
  type: "function",
  name: "officialEventExtractor",
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

const SYSTEM_PROMPT = `
You convert a research draft into a deterministic trading plan.

Respond ONLY by calling the tool "officialEventExtractor" with:
{ "plan": PlanItem[] }

Constraints:
- Time window: last two years from today. Drop older events.
- Timezone: America/New_York (ET). All timestamps MUST be ISO8601 with offset.
- entry.at and exit.at are REQUIRED for all items (never null). If a timestamp cannot be determined from official sources, drop that ticker.
- source and url are OPTIONAL. If present:
  - source = name of the publication or organization where the URL points
  - url = direct link to the official source
- Use only official URLs from the research input (issuer IR, SEC, exchange, index provider). Never blogs or news aggregators.
- No natural language or questions.

PlanItem schema:
{
  ticker: string,
  entry: { at: string, source?: string, url?: string },
  exit:  { at: string, source?: string, url?: string }
}

Rules:
- Keep only tickers with BOTH entry and exit legs.
- Prefer precise timestamps from the official source.
- Max 5 items. If there are more, keep the most representative 5.
`;

// Stage 2: Structure unstructured transcript/content into OFFICIAL_EVENT_TOOL
export async function structurePlanFromTranscript(
  transcript: string
): Promise<Plan> {
  if (!env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY required to structure plan");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response: any = await client.responses.create({
    model: "gpt-5-mini",
    tools: [OFFICIAL_EVENT_TOOL as any],
    tool_choice: { type: "function", name: "officialEventExtractor" },
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Given the following gathered transcript, extract a Plan strictly via a single call to officialEventExtractor.\n\n${transcript}`,
      },
    ],
  });
  const outputs: any[] = response.output ?? [];
  // Accept either 'function_call' (Responses API) or legacy 'tool_call'
  const fnCallItem = outputs.find(
    (o: any) =>
      o.type === "function_call" && o.name === "officialEventExtractor"
  );
  if (fnCallItem?.arguments) {
    const parsed = JSON.parse(fnCallItem.arguments);
    return (parsed?.plan ?? parsed) as Plan;
  }
  const toolCallItem = outputs.find(
    (o: any) => o.type === "tool_call" && o.name === "officialEventExtractor"
  );
  if (toolCallItem?.arguments) {
    const parsed = JSON.parse(toolCallItem.arguments);
    return (parsed?.plan ?? parsed) as Plan;
  }
  // Fallback parse path for SDKs that surface choices-like shape
  const choiceToolCall = response.choices?.[0]?.message?.tool_calls?.[0];
  if (
    choiceToolCall?.function?.name === "officialEventExtractor" &&
    typeof choiceToolCall.function.arguments === "string"
  ) {
    const parsed = JSON.parse(choiceToolCall.function.arguments);
    return (parsed?.plan ?? parsed) as Plan;
  }
  throw new Error(
    "No officialEventExtractor tool call in structuring response"
  );
}
