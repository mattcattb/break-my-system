import {addErrorHandling} from "./common/errors";
import {addGlobalMiddlewares, createRouter} from "./common/hono";

import {systemsController} from "./systems/systems.controller";
import {wsController} from "./ws/ws.controller";
import {sandboxController} from "./sandbox/sandbox.controller";

export const app = createRouter();
addGlobalMiddlewares(app);
addErrorHandling(app);

export const api = app
  .basePath("/api")
  .route("/systems", systemsController)
  .route("/sandbox", sandboxController);

app.route("/ws", wsController);

export type AppType = typeof api;
