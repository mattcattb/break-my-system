import {addErrorHandling} from "./common/errors";
import {addGlobalMiddlewares, createRouter} from "./common/hono";

import {authController} from "./auth/auth.controller";
import {authMiddleware} from "./auth/auth.middleware";
import {systemsController} from "./systems/systems.controller";
import {wsController} from "./ws/ws.controller";
import {sandboxController} from "./sandbox/sandbox.controller";

export const app = createRouter();
addGlobalMiddlewares(app);
addErrorHandling(app);

export const api = app
  .basePath("/api")
  .route("/auth", authController)
  .route("/systems", systemsController)
  .route("/sandbox", sandboxController);

app.route("/ws", wsController);

export type AppType = typeof api;
