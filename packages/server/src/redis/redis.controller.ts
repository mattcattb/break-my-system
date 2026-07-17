import {zValidator} from "@hono/zod-validator";
import {createRouter} from "../common/hono";
import {
  createKeyExplorer,
  getKeyExplorerSnapshot,
  inspectKeyExplorer,
  inspectKeyJson,
  removeKeyExplorer,
  scanKeyExplorer,
  scanKeysJson,
} from "./key-explorer";
import {
  createRedisTerminal,
  executeRedisTerminalCommand,
  getRedisTerminalHistory,
  getRedisTerminalSnapshot,
  removeRedisTerminal,
  sendRedisCommandJson,
} from "./command-terminal";
import {getRedisDiagnostics} from "./redis.connection";
import {
  closeRedisWorkspace,
  createRedisWorkspace,
  getRedisWorkspaceSnapshot,
  listRedisWorkspaceSnapshots,
} from "./redis.workspace";
import {requireRedisWorkspaceMW, type RedisWorkspaceEnv} from "./redis.workspace.middleware";

export const redisWorkspaceController = createRouter<RedisWorkspaceEnv>()
  .get("/", (c) => c.json({workspaces: listRedisWorkspaceSnapshots()}, 200))
  .post("/", (c) => c.json(getRedisWorkspaceSnapshot(createRedisWorkspace()), 201))
  .use("/:workspaceId", requireRedisWorkspaceMW)
  .use("/:workspaceId/*", requireRedisWorkspaceMW)
  .get("/:workspaceId", (c) => c.json(getRedisWorkspaceSnapshot(c.get("redisWorkspace")), 200))
  .delete("/:workspaceId", async (c) => {
    await closeRedisWorkspace(c.get("redisWorkspace"));
    return c.json({removed: true}, 200);
  })
  .post("/:workspaceId/connection/connect", async (c) => {
    const workspace = c.get("redisWorkspace");
    await workspace.connection.connect();
    return c.json(getRedisWorkspaceSnapshot(workspace), 200);
  })
  .post("/:workspaceId/connection/disconnect", async (c) => {
    const workspace = c.get("redisWorkspace");
    await workspace.connection.disconnect();
    return c.json(getRedisWorkspaceSnapshot(workspace), 200);
  })
  .get("/:workspaceId/connection/status", async (c) =>
    c.json(await getRedisDiagnostics(c.get("redisWorkspace").connection), 200),
  )
  .post("/:workspaceId/terminals", (c) => {
    const workspace = c.get("redisWorkspace");
    const terminal = createRedisTerminal(workspace);
    return c.json(getRedisTerminalSnapshot(terminal, workspace.connection.getStatus()), 201);
  })
  .get("/:workspaceId/terminals/:terminalId/history", (c) =>
    c.json(getRedisTerminalHistory(c.get("redisWorkspace"), c.req.param("terminalId")), 200),
  )
  .post(
    "/:workspaceId/terminals/:terminalId/command",
    zValidator("json", sendRedisCommandJson),
    async (c) =>
      c.json(
        await executeRedisTerminalCommand(
          c.get("redisWorkspace"),
          c.req.param("terminalId"),
          c.req.valid("json").command,
        ),
        200,
      ),
  )
  .delete("/:workspaceId/terminals/:terminalId", (c) => {
    removeRedisTerminal(c.get("redisWorkspace"), c.req.param("terminalId"));
    return c.json({removed: true}, 200);
  })
  .post("/:workspaceId/key-explorers", (c) => {
    const workspace = c.get("redisWorkspace");
    const explorer = createKeyExplorer(workspace);
    return c.json(getKeyExplorerSnapshot(explorer, workspace.connection.getStatus()), 201);
  })
  .post(
    "/:workspaceId/key-explorers/:explorerId/scan",
    zValidator("json", scanKeysJson),
    async (c) =>
      c.json(
        await scanKeyExplorer(
          c.get("redisWorkspace"),
          c.req.param("explorerId"),
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .post(
    "/:workspaceId/key-explorers/:explorerId/inspect",
    zValidator("json", inspectKeyJson),
    async (c) =>
      c.json(
        await inspectKeyExplorer(
          c.get("redisWorkspace"),
          c.req.param("explorerId"),
          c.req.valid("json").key,
        ),
        200,
      ),
  )
  .delete("/:workspaceId/key-explorers/:explorerId", (c) => {
    removeKeyExplorer(c.get("redisWorkspace"), c.req.param("explorerId"));
    return c.json({removed: true}, 200);
  });
