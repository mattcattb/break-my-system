import {zValidator} from "@hono/zod-validator";
import {createRouter} from "../../../common/hono";
import type {SandboxEnv} from "../../../sandbox/sandbox.middleware";
import {removeSandboxTool} from "../../../sandbox/sandbox.runtime";
import {
  createKeyExplorer,
  inspectKeyExplorerKey,
  inspectKeyJson,
  scanKeyExplorer,
  scanKeysJson,
} from "./kv-explorer";

export const keyExplorerController = createRouter<SandboxEnv>()
  .post("/:sandboxId/key-explorer", (c) => {
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
    await removeSandboxTool(
      c.get("sandbox"),
      c.req.param("explorerId"),
      "redis-key-explorer",
    );
    return c.json({removed: true}, 200);
  });
