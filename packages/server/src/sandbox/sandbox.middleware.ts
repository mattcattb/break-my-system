import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closeSandbox,
  getSandbox,
  hasDurationExceeded,
  hasTtlExpired,
} from "./sandbox.runtime";
import type {Sandbox} from "./sandbox";

export type SandboxVariables = {
  sandbox: Sandbox;
  sandboxId: string;
};

export type SandboxEnv = {
  Variables: SandboxVariables;
};

export const requireSandboxMW = createMiddleware<SandboxEnv>(
  async (c, next) => {
    const sandboxId = c.req.param("sandboxId");
    if (!sandboxId) {
      throw new NotFoundException({
        appCode: "SANDBOX_NOT_FOUND",
        message: "Sandbox missing sandboxId parameter",
      });
    }

    const sandbox = getSandbox(sandboxId);

    if (!sandbox) {
      throw new NotFoundException({
        appCode: "SANDBOX_NOT_FOUND",
        details: {sandboxId},
      });
    }

    if (hasTtlExpired(sandbox) || hasDurationExceeded(sandbox)) {
      await closeSandbox(sandbox);
      throw new NotFoundException({
        appCode: "SANDBOX_EXPIRED",
        details: {sandboxId},
      });
    }

    sandbox.touch();
    c.set("sandboxId", sandbox.id);
    c.set("sandbox", sandbox);
    await next();
  },
);
