import {z} from "zod";

const DEFAULT_REDIS_URL = "redis://localhost:26379";
const DEFAULT_WAD_DATA_DIR = "/tmp/break-my-system/wads";

const appEnvSchema = z.object({
  PLC_HOST: z.string().default("127.0.0.1"),
  PLC_PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(7474)),
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
  WAD_DATA_DIR: z.string().default(DEFAULT_WAD_DATA_DIR),
  WAD_HOST: z.string().default("127.0.0.1"),
  WAD_PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(27373)),
  WAD_MAX_UPLOAD_BYTES: z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() !== "") {
        return Number(value);
      }
      return value;
    },
    z
      .number()
      .int()
      .positive()
      .default(25 * 1024 * 1024),
  ),

  NODE_ENV: z.string().optional(),

  PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(3000)),
});
export const appEnv = appEnvSchema.parse(process.env);
