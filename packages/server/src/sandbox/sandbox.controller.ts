import {createRouter} from "../common/hono";
import {requireSandboxMW, type SandboxEnv} from "./sandbox.middleware";
import {
  closeSandbox,
  createSandbox,
  getSandboxSnapshot,
  listSandboxSnapshots,
} from "./sandbox.runtime";
import {
  connectCommandTerminal,
  createCommandTerminal,
  disconnectCommandTerminal,
  executeCommandTerminal,
  getCommandTerminalHistory,
  getCommandTerminalRedisStatus,
  reconnectCommandTerminal,
  removeCommandTerminal,
  sendCommandJson,
} from "../systems/redis/command-terminal/command-terminal";
import {
  createKeyExplorer,
  inspectKeyExplorerKey,
  inspectKeyJson,
  removeKeyExplorer,
  scanKeyExplorer,
  scanKeysJson,
} from "../tools/kv-explorer";
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
  .get("/:sandboxId/terminal/:terminalId/history", async (c) => {
    return c.json(
      getCommandTerminalHistory(c.get("sandbox"), c.req.param("terminalId")),
      200,
    );
  })
  .post("/:sandboxId/terminal/:terminalId/connect", async (c) => {
    return c.json(
      await connectCommandTerminal(c.get("sandbox"), c.req.param("terminalId")),
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
  .post("/:sandboxId/key-explorer", async (c) => {
    return c.json(createKeyExplorer(c.get("sandbox")), 200);
  })
  .post(
    "/:sandboxId/key-explorer/:explorerId/scan",
    zValidator("json", scanKeysJson),
    async (c) => {
      return c.json(
        await scanKeyExplorer(
          c.get("sandbox"),
          c.req.param("explorerId"),
          c.req.valid("json"),
        ),
        200,
      );
    },
  )
  .post(
    "/:sandboxId/key-explorer/:explorerId/inspect",
    zValidator("json", inspectKeyJson),
    async (c) => {
      return c.json(
        await inspectKeyExplorerKey(
          c.get("sandbox"),
          c.req.param("explorerId"),
          c.req.valid("json").key,
        ),
        200,
      );
    },
  )
  .delete("/:sandboxId/key-explorer/:explorerId", async (c) => {
    await removeKeyExplorer(c.get("sandbox"), c.req.param("explorerId"));
    return c.json({removed: true}, 200);
  })
  .delete("/:sandboxId/terminal/:terminalId", async (c) => {
    const sandbox = c.get("sandbox");
    const removed = await removeCommandTerminal(
      sandbox,
      c.req.param("terminalId"),
    );
    return c.json({removed}, 200);
  });
