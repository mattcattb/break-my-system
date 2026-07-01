import {app} from "./app";
import {appEnv} from "./common/env";
import {logger} from "./common/logger";
import {startServerRuntime} from "./common/server";
import {connectRedis, disconnectRedis} from "./lib/redis";
import {
  cleanupExpiredSandboxes,
  clearAllSandboxes,
} from "./sandbox/sandbox.runtime";
import {websocket} from "./ws/ws.controller";

const port = appEnv.PORT;

await startServerRuntime({
  name: "api",
  port,
  connections: [
    {
      name: "redis",
      connect: connectRedis,
      disconnect: disconnectRedis,
    },
  ],
});

const interval = setInterval(
  async () =>
    cleanupExpiredSandboxes().catch((err) => {
      console.error({err}, "error occured cleaning up existing sandboxes");
    }),
  1000 * 60 * 3,
);

const shutdown = async (signal: number) => {
  console.log(`Shutdown signal ${signal} recieved!`);

  clearInterval(interval);
  await clearAllSandboxes();
};

logger.info(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
