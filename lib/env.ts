import { z } from "zod";

const schema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  POLYGON_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = schema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

export const isDemo = !env.POLYGON_API_KEY;
