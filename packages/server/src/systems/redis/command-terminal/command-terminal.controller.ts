import {zValidator} from "@hono/zod-validator";
import {createRouter} from "../../../common/hono";
import {ConnectionRegistry} from "../../../connections/connection-registry";
import {requireTool} from "../../../sandbox/sandbox";
import type {SandboxEnv} from "../../../sandbox/sandbox.middleware";
import {removeSandboxTool} from "../../../sandbox/sandbox.runtime";
import {
  createCommandTerminal,
  executeCommandTerminal,
  getCommandTerminalHistory,
  getCommandTerminalSnapshot,
  sendCommandJson,
} from "./command-terminal";
import {getRedisDiagnostics} from "../redis.connection";

const requireTerminalConnection = (
  sandbox: SandboxEnv["Variables"]["sandbox"],
  terminalId: string,
) => {
  const tool = requireTool(sandbox, terminalId, "command-terminal");
  const connection = ConnectionRegistry.require(
    tool.connectionId,
    sandbox.id,
    "redis",
  );

  return {connection, tool};
};

export const commandTerminalController = createRouter<SandboxEnv>()
  .post("/:sandboxId/terminal", (c) => {
    return c.json(createCommandTerminal(c.get("sandbox")), 200);
  })
  .post(
    "/:sandboxId/terminal/:terminalId/command",
    zValidator("json", sendCommandJson),
    async (c) => {
      const execution = await executeCommandTerminal(
        c.get("sandbox"),
        c.req.param("terminalId"),
        c.req.valid("json").command,
      );
      return c.json(execution, 200);
    },
  )
  .get("/:sandboxId/terminal/:terminalId/history", (c) => {
    return c.json(
      getCommandTerminalHistory(c.get("sandbox"), c.req.param("terminalId")),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/connect", async (c) => {
    const {connection, tool} = requireTerminalConnection(
      c.get("sandbox"),
      c.req.param("terminalId"),
    );
    await connection.connect();
    return c.json(
      getCommandTerminalSnapshot(tool, connection.getStatus()),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/disconnect", async (c) => {
    const {connection, tool} = requireTerminalConnection(
      c.get("sandbox"),
      c.req.param("terminalId"),
    );
    await connection.disconnect();
    return c.json(
      getCommandTerminalSnapshot(tool, connection.getStatus()),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/reconnect", async (c) => {
    const {connection, tool} = requireTerminalConnection(
      c.get("sandbox"),
      c.req.param("terminalId"),
    );
    await connection.disconnect();
    await connection.connect();
    return c.json(
      getCommandTerminalSnapshot(tool, connection.getStatus()),
      200,
    );
  })
  .get("/:sandboxId/terminal/:terminalId/redis/status", async (c) => {
    const {connection} = requireTerminalConnection(
      c.get("sandbox"),
      c.req.param("terminalId"),
    );
    return c.json(await getRedisDiagnostics(connection), 200);
  })
  .delete("/:sandboxId/terminal/:terminalId", async (c) => {
    await removeSandboxTool(
      c.get("sandbox"),
      c.req.param("terminalId"),
      "command-terminal",
    );
    return c.json({removed: true}, 200);
  });
