import {createRouter} from "../common/hono";
import {requireSandboxMW, type SandboxEnv} from "./sandbox.middleware";
import {
  closeSandbox,
  connectCommandTerminal,
  createSandbox,
  createSandboxCommandTerminal,
  disconnectCommandTerminal,
  getCommandTerminalHistory,
  getCommandTerminalRedisStatus,
  getSandboxSnapshot,
  inspectCommandTerminalRedisKey,
  inspectRedisKeyJson,
  listSandboxSnapshots,
  reconnectCommandTerminal,
  removeSandboxTool,
  sendCommand,
  sendCommandJson,
} from "./sandbox.runtime";
import {zValidator} from "@hono/zod-validator";

export const sandboxController = createRouter<SandboxEnv>()
  .get("/list", async (c) => {
    return c.json({sandboxes: listSandboxSnapshots()}, 200);
  })
  .post("/", async (c) => {
    const sandbox = createSandbox();
    return c.json(getSandboxSnapshot(sandbox), 200);
  })
  .use("/:sandboxId", requireSandboxMW)
  .use("/:sandboxId/*", requireSandboxMW)
  .get("/:sandboxId", async (c) => {
    const sandbox = c.get("sandbox");
    return c.json(getSandboxSnapshot(sandbox), 200);
  })
  .delete("/:sandboxId", async (c) => {
    const sandbox = c.get("sandbox");
    await closeSandbox(sandbox);
    return c.json({removed: true}, 200);
  })
  .post("/:sandboxId/terminal", async (c) => {
    return c.json(createSandboxCommandTerminal(c.get("sandbox")), 200);
  })
  .post(
    "/:sandboxId/terminal/:terminalId/command",
    zValidator("json", sendCommandJson),
    async (c) => {
      const execution = await sendCommand(
        c.get("sandbox"),
        c.req.param("terminalId"),
        c.req.valid("json").command,
      );
      return c.json(execution, 200);
    },
  )
  .get("/:sandboxId/terminal/:terminalId/history", async (c) => {
    return c.json(
      getCommandTerminalHistory(c.get("sandbox"), c.req.param("terminalId")),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/connect", async (c) => {
    return c.json(
      await connectCommandTerminal(
        c.get("sandbox"),
        c.req.param("terminalId"),
      ),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/disconnect", async (c) => {
    return c.json(
      await disconnectCommandTerminal(
        c.get("sandbox"),
        c.req.param("terminalId"),
      ),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/reconnect", async (c) => {
    return c.json(
      await reconnectCommandTerminal(
        c.get("sandbox"),
        c.req.param("terminalId"),
      ),
      200,
    );
  })
  .get("/:sandboxId/terminal/:terminalId/redis/status", async (c) => {
    return c.json(
      await getCommandTerminalRedisStatus(
        c.get("sandbox"),
        c.req.param("terminalId"),
      ),
      200,
    );
  })
  .post(
    "/:sandboxId/terminal/:terminalId/redis/inspect",
    zValidator("json", inspectRedisKeyJson),
    async (c) => {
      return c.json(
        await inspectCommandTerminalRedisKey(
          c.get("sandbox"),
          c.req.param("terminalId"),
          c.req.valid("json").key,
        ),
        200,
      );
    },
  )
  .delete("/:sandboxId/terminal/:terminalId", async (c) => {
    const sandbox = c.get("sandbox");
    const removed = await removeSandboxTool(sandbox, c.req.param("terminalId"));
    return c.json({removed}, 200);
  });
