import {createRouter} from "../common/hono";
import {requireSandboxMW, type SandboxEnv} from "./sandbox.middleware";
import {
  closeSandbox,
  createSandbox,
  getSandboxSnapshot,
  listSandboxSnapshots,
} from "./sandbox.runtime";
import {commandTerminalController} from "../systems/redis/command-terminal/command-terminal.controller";
import {keyExplorerController} from "../systems/redis/key-explorer/key-explorer.controller";

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
  .route("/", commandTerminalController)
  .route("/", keyExplorerController);
