import {z} from "zod";

const DEFAULT_REDIS_URL = "redis://localhost:26379";

const appEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z
    .preprocess((value) => {
      if (typeof value === "string" && value.trim() !== "") {
        return value;
      }
      return DEFAULT_REDIS_URL;
    }, z.string().url())
    .optional(),

  LOG_LEVEL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  NODE_ENV: z.string().optional(),

  PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(3000)),
});
export const appEnv = appEnvSchema.parse(process.env);
