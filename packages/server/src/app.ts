import {addErrorHandling} from "./common/errors";
import {addGlobalMiddlewares, createRouter} from "./common/hono";

import {authController} from "./auth/auth.controller";
import {authMiddleware} from "./auth/auth.middleware";
import {projectsController} from "./projects/projects.controller";
import {systemsController} from "./systems/systems.controller";
import {wsController} from "./ws/ws.controller";

export const app = createRouter();
addGlobalMiddlewares(app);
addErrorHandling(app);

app.route("/api/auth", authController);
app.route("/api/systems", systemsController);
app.route("/ws", wsController);

export const api = createRouter()
  .use("*", authMiddleware)
  .route("/projects", projectsController);

app.route("/api", api);

export type AppType = typeof api;
