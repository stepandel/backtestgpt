import { NextRequest } from "next/server";
import { structurePlanFromTranscript } from "@/lib/planner";
import { z } from "zod";

const Body = z.object({
  transcript: z.string(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { transcript } = Body.parse(json);
  const plan = await structurePlanFromTranscript(transcript);
  console.log("plan", plan);
  return Response.json(plan);
}
