import {addErrorHandling} from "./common/errors";
import {addGlobalMiddlewares, createRouter} from "./common/hono";

import {systemsController} from "./systems/systems.controller";
import {redisWorkspaceController} from "./redis/redis.controller";
import {wadController} from "./wad/wad.controller";
import {plcController} from "./plc/plc.controller";
import {redisWsController} from "./redis/redis.ws";
import {minesweeperController} from "./minesweeper/minesweeper.controller";
import {minesweeperWsController} from "./minesweeper/minesweeper.ws";

export const app = createRouter();
addGlobalMiddlewares(app);
addErrorHandling(app);

export const api = app
  .basePath("/api")
  .route("/systems", systemsController)
  .route("/redis/workspaces", redisWorkspaceController)
  .route("/wad", wadController)
  .route("/minesweeper", minesweeperController)
  .route("/plc", plcController);

app.route("/ws/redis", redisWsController);
app.route("/ws/minesweeper", minesweeperWsController);

export type AppType = typeof api;
