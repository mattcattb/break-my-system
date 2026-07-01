import {app} from "./app";
import {appEnv} from "./common/env";
import {logger} from "./common/logger";
import {startServerRuntime} from "./common/server";
import {connectRedis, disconnectRedis} from "./lib/redis";
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

logger.info(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
