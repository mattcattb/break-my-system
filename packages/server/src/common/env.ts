import {z} from "zod";

const DEFAULT_REDIS_URL = "redis://localhost:6379";

const betterAuthSchema = z.object({
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
});

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

const githubEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

const appEnvSchema = z.object({
  ...betterAuthSchema.shape,
  ...googleEnvSchema.shape,
  ...githubEnvSchema.shape,
  DATABASE_URL: z.string(),
  REDIS_URL: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
    return DEFAULT_REDIS_URL;
  }, z.string().url()),

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
