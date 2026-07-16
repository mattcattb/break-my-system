import {addErrorHandling} from "./common/errors";
import {addGlobalMiddlewares, createRouter} from "./common/hono";

import {systemsController} from "./systems/systems.controller";
import {wsController} from "./ws/ws.controller";
import {redisController} from "./systems/redis/redis.controller";
import {wadController} from "./systems/wad/wad.controller";
import {plcController} from "./systems/plc/plc.controller";

export const app = createRouter();
addGlobalMiddlewares(app);
addErrorHandling(app);

export const api = app
  .basePath("/api")
  .route("/systems", systemsController)
  .route("/redis", redisController)
  .route("/wad", wadController)
  .route("/plc", plcController);

app.route("/ws/redis", wsController);

export type AppType = typeof api;
