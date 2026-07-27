import {z} from "zod";

const DEFAULT_REDIS_URL = "redis://localhost:26379";
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:15432/break_my_system";
const DEFAULT_WAD_DATA_DIR = "/tmp/break-my-system/wads";
const DEFAULT_TORRENT_TRACKER_STATUS_URL =
  "http://127.0.0.1:18080/v1/snapshot";
const DEFAULT_TORRENT_SEED_STATUS_URL =
  "http://127.0.0.1:18081/v1/snapshot";
const DEFAULT_TORRENT_LEARNER_1_STATUS_URL =
  "http://127.0.0.1:18082/v1/snapshot";
const DEFAULT_TORRENT_LEARNER_2_STATUS_URL =
  "http://127.0.0.1:18083/v1/snapshot";
const isDevelopment = process.env.NODE_ENV !== "production";

const appEnvSchema = z.object({
  MINESWEEPER_URL: z.string().url().optional(),
  PLC_URL: z.string().url().optional(),
  TORRENT_TRACKER_STATUS_URL: z.string().url().optional(),
  TORRENT_SEED_STATUS_URL: z.string().url().optional(),
  TORRENT_LEARNER_1_STATUS_URL: z.string().url().optional(),
  TORRENT_LEARNER_2_STATUS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().url().optional(),

  LOG_LEVEL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  WAD_DATA_DIR: z.string().default(DEFAULT_WAD_DATA_DIR),
  WAD_URL: z.string().url().optional(),
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
export const appEnv = appEnvSchema.parse({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL?.trim() ||
    (isDevelopment ? DEFAULT_DATABASE_URL : undefined),
  REDIS_URL:
    process.env.REDIS_URL?.trim() ||
    (isDevelopment ? DEFAULT_REDIS_URL : undefined),
  TORRENT_TRACKER_STATUS_URL:
    process.env.TORRENT_TRACKER_STATUS_URL?.trim() ||
    (isDevelopment ? DEFAULT_TORRENT_TRACKER_STATUS_URL : undefined),
  TORRENT_SEED_STATUS_URL:
    process.env.TORRENT_SEED_STATUS_URL?.trim() ||
    (isDevelopment ? DEFAULT_TORRENT_SEED_STATUS_URL : undefined),
  TORRENT_LEARNER_1_STATUS_URL:
    process.env.TORRENT_LEARNER_1_STATUS_URL?.trim() ||
    (isDevelopment ? DEFAULT_TORRENT_LEARNER_1_STATUS_URL : undefined),
  TORRENT_LEARNER_2_STATUS_URL:
    process.env.TORRENT_LEARNER_2_STATUS_URL?.trim() ||
    (isDevelopment ? DEFAULT_TORRENT_LEARNER_2_STATUS_URL : undefined),
});
