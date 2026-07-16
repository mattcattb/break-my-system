import {zValidator} from "@hono/zod-validator";
import {createRouter} from "../../../common/hono";
import {requireTool} from "../../../sandbox/sandbox";
import {requireSandboxMW} from "../../../sandbox/sandbox.middleware";
import {
  inspectKeyExplorerKey,
  inspectKeyJson,
  scanKeyExplorer,
  scanKeysJson,
} from "./kv-explorer";

export const keyExplorerController = createRouter()
  .use(requireSandboxMW)
  .post("/scan/:toolId", zValidator("json", scanKeysJson), async (c) => {
    const toolId = c.req.param("toolId");
    const sandbox = c.get("sandbox");
    const json = c.req.valid("json");

    const keyExplorerTool = requireTool(sandbox, toolId, "redis-key-explorer");

    const resp = await scanKeyExplorer(keyExplorerTool, json);
    return c.json(resp, 200);
  })
  .post("/inspect/:toolId", zValidator("json", inspectKeyJson), async (c) => {
    const sandbox = c.get("sandbox");
    const toolId = c.req.param("toolId");
    const json = c.req.valid("json");
    const kvTool = requireTool(sandbox, toolId, "redis-key-explorer");

    const resp = await inspectKeyExplorerKey(kvTool, json.key);

    return c.json(resp, 200);
  });
