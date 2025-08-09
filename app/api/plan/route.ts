import { NextRequest } from "next/server";
import { z } from "zod";
import { createPlanFromPrompt } from "@/lib/planner";

const Body = z.object({ prompt: z.string().min(10) });

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { prompt } = Body.parse(json);
  const plan = await createPlanFromPrompt(prompt);
  return Response.json(plan);
}
