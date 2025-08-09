import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createPlanFromPrompt,
  structurePlanFromTranscript,
} from "@/lib/planner";

const Body = z.union([
  z.object({ prompt: z.string().min(10) }),
  z.object({ transcript: z.string().min(10) }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json();
  const data = Body.parse(json);
  const plan =
    "transcript" in data
      ? await structurePlanFromTranscript(data.transcript)
      : await createPlanFromPrompt(data.prompt);
  return Response.json(plan);
}
