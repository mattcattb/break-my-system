import {websocket} from "hono/bun";
import {app} from "./app";
import {appEnv} from "./common/env";
import {logger} from "./common/logger";
import {connectRedis, disconnectRedis} from "./lib/redis";
import {
  cleanupExpiredSandboxes,
  clearAllSandboxes,
} from "./sandbox/sandbox.runtime";

await connectRedis();

const server = Bun.serve({
  port: appEnv.PORT,
  fetch: app.fetch,
  websocket,
});

const sandboxCleanupInterval = setInterval(
  () => {
    void cleanupExpiredSandboxes().catch((error) => {
      logger.error({error}, "Expired sandbox cleanup failed");
    });
  },
  3 * 60 * 1000,
);

let shuttingDown = false;

const shutdown = async (reason: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({reason}, "Server shutting down");
  clearInterval(sandboxCleanupInterval);

  try {
    await server.stop(true);
    await clearAllSandboxes();
    await disconnectRedis();
    logger.info({reason}, "Server shutdown complete");
  } catch (error) {
    logger.error({error, reason}, "Server shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

logger.info(`Server running on ${server.url}`);
