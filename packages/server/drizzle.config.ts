import {defineConfig} from "drizzle-kit";
import {appEnv} from "./src/common/env";

if (!appEnv.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for database commands");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: appEnv.DATABASE_URL,
  },
});
