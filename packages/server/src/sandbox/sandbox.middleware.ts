import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closeSandbox,
  getSandbox,
  hasDurationExceeded,
  hasTtlExpired,
  type Sandbox,
} from "./sandbox.runtime";

export const requireSandboxMW = createMiddleware<{
  Variables: {sandboxId: string; sandbox: Sandbox};
}>(async (c, next) => {
  const headers = c.req.header();
  const sandboxId = headers["X-Sandbox-Id"];

  if (sandboxId.length == 0) {
    throw new NotFoundException("X-Sandbox-Id header not found");
  }

  // here we use the bearer auth token as the sandboxId here, throwing if doenst exist or getting it from the map
  const sandbox = getSandbox(sandboxId);

  if (!sandbox) {
    throw new NotFoundException("Sandbox does not exist");
  }

  if (hasTtlExpired(sandbox) || hasDurationExceeded(sandbox)) {
    await closeSandbox(sandbox);
    throw new NotFoundException(`Sandbox ${sandboxId} has expired`);
  }

  c.set("sandboxId", sandbox.id);
  c.set("sandbox", sandbox);
  next();
});
