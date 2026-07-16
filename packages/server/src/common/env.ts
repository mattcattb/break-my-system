import {z} from "zod";
import {resolve} from "node:path";
import {existsSync} from "node:fs";

const DEFAULT_REDIS_URL = "redis://localhost:26379";
const DEFAULT_WAD_DATA_DIR = "/tmp/break-my-system/wads";
const DEFAULT_WADCTL_PATH = [
  resolve(process.cwd(), "native/wad/wadctl"),
  resolve(process.cwd(), "packages/server/native/wad/wadctl"),
].find(existsSync) ?? resolve(process.cwd(), "native/wad/wadctl");

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
  PLC_PROJECT_PATH: z.string().optional(),
  PLC_JAVA_HOME: z.string().optional(),

  WAD_DATA_DIR: z.string().default(DEFAULT_WAD_DATA_DIR),
  WADCTL_PATH: z.string().default(DEFAULT_WADCTL_PATH),
  WAD_MAX_UPLOAD_BYTES: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(25 * 1024 * 1024)),

  NODE_ENV: z.string().optional(),

  PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().int().positive().default(3000)),
});
export const appEnv = appEnvSchema.parse(process.env);
