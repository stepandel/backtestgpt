import { NextRequest } from "next/server";
import { structurePlanFromTranscript } from "@/lib/planner";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const plan = await structurePlanFromTranscript(json);
  return Response.json(plan);
}
