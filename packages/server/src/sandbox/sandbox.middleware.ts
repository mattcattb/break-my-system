import {createMiddleware} from "hono/factory";
import * as sandboxRuntime from "./sandbox.runtime";
import {bearerAuth} from "hono/bearer-auth";
import {NotFoundException} from "../common/errors";

export const requireSandboxMW = createMiddleware<{
  Variables: {sandboxId: string};
}>(async (c, next) => {
  const headers = c.req.header();
  const sandboxId = headers["X-Sandbox-Id"];

  if (sandboxId.length == 0) {
    throw new NotFoundException("X-Sandbox-Id header not found");
  }

  // here we use the bearer auth token as the sandboxId here, throwing if doenst exist or getting it from the map
  const sandbox = sandboxRuntime.getSandbox(sandboxId);

  if (!sandbox) {
    throw new NotFoundException("Sandbox does not exist");
  }

  c.set("sandboxId", sandbox.id);
  next();
});
