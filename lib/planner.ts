import { env } from "@/lib/env";
import openai from "openai";
import OpenAI from "openai";

export type PlanItem = {
  ticker: string;
  entry: { at: string | null; source: string; url: string };
  exit: { at: string | null; source: string; url: string };
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

// export const OFFICIAL_EVENT_TOOL = {
//   type: "function",
//   name: "officialEventExtractor",
//   function: {
//     description:
//       "Extracts trading plan data from a user strategy prompt, enriched with official source dates for entry/exit.",
//     strict: true,
//     parameters: {
//       type: "object",
//       additionalProperties: false,
//       properties: {
//         plan: {
//           type: "array",
//           description:
//             "Array of tickers with official entry/exit data for backtesting.",
//           items: {
//             type: "object",
//             additionalProperties: false,
//             properties: {
//               ticker: {
//                 type: "string",
//                 description: "Stock ticker symbol.",
//               },
//               entry: {
//                 type: "object",
//                 additionalProperties: false,
//                 properties: {
//                   at: {
//                     type: "string",
//                     description:
//                       "Entry timestamp in ISO8601 with offset (America/New_York).",
//                     pattern:
//                       "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}([-+]\\d{2}:\\d{2}|Z)$",
//                   },
//                   source: {
//                     type: "string",
//                     description:
//                       "Name of the publication/organization (e.g., 'S&P Dow Jones Indices', 'NYSE').",
//                   },
//                   url: {
//                     type: "string",
//                     description: "Official source URL for the entry event.",
//                   },
//                 },
//                 required: ["at"],
//               },
//               exit: {
//                 type: "object",
//                 additionalProperties: false,
//                 properties: {
//                   at: {
//                     type: "string",
//                     description:
//                       "Exit timestamp in ISO8601 with offset (America/New_York).",
//                     pattern:
//                       "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}([-+]\\d{2}:\\d{2}|Z)$",
//                   },
//                   source: {
//                     type: "string",
//                     description: "Name of the publication/organization.",
//                   },
//                   url: {
//                     type: "string",
//                     description: "Official source URL for the exit event.",
//                   },
//                 },
//                 required: ["at"],
//               },
//             },
//             required: ["ticker", "entry", "exit"],
//           },
//         },
//       },
//       required: ["plan"],
//     },
//   },
// } as const;

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
- Max 20 items.
`;

// Stage 2: Structure unstructured transcript/content into OFFICIAL_EVENT_TOOL
export async function structurePlanFromTranscript(
  transcript: string
): Promise<Plan> {
  console.log("transcript", transcript);
  if (!env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY required to structure plan");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    prompt: {
      id: "pmpt_6897e44cf814819481c080c9a3d275d80e2bae4d4ff8c75d",
      version: "4",
    },
    input: [
      {
        role: "user",
        content: JSON.stringify(transcript),
      },
    ],
  });
  const outputs: any[] = response.output ?? [];
  const toolCallItem = outputs.find(
    (o: any) => o.type === "tool_call" && o.name === "officialEventExtractor"
  );
  if (toolCallItem?.arguments) {
    const parsed = JSON.parse(toolCallItem.arguments);
    return (parsed?.plan ?? parsed) as Plan;
  }
  throw new Error(
    "No officialEventExtractor tool call in structuring response"
  );
}
