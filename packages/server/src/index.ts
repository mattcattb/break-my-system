import {websocket} from "hono/bun";
import {app} from "./app";
import {appEnv} from "./common/env";
import {logger} from "./common/logger";

const server = Bun.serve({
  port: appEnv.PORT,
  fetch: app.fetch,
  websocket,
});

let shuttingDown = false;

const shutdown = async (reason: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({reason}, "Server shutting down");
  try {
    await server.stop(true);
    logger.info({reason}, "Server shutdown complete");
  } catch (error) {
    logger.error({error, reason}, "Server shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

logger.info(`Server running on ${server.url}`);
