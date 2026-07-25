import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

import {appEnv} from "../common/env";

const connectionString = appEnv.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for database-backed features");
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export const closeDb = () => client.end();
