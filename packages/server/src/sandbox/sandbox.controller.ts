import {zValidator} from "@hono/zod-validator";
import {createRouter} from "../common/hono";
import {requireSandboxMW} from "./sandbox.middleware";
import {
  createSandbox,
  getTerminals,
  removeSandboxTerminal,
  sendCommand,
  sendCommandJson,
} from "./sandbox.runtime";
import {TerminalRuntime} from "./terminal.runtime";

export const sandboxController = createRouter()
  .get("/", requireSandboxMW, async (c) => {
    const {terminals, ...rest} = c.get("sandbox");

    return c.json({...rest}, 200);
  })
  .post("/", async (c) => {
    // create a sandbox
    const {terminals, ...rest} = createSandbox();
    return c.json(rest, 200);
  })
  .get("/terminals", requireSandboxMW, async (c) => {
    const s = c.get("sandbox");
    const data = getTerminals(s);
    return c.json(data, 200);
  })
  .get("/terminal/:id", requireSandboxMW, async (c) => {})
  .post("/terminal/delete/:id", requireSandboxMW, async (c) => {
    const sandbox = c.get("sandbox");
    const txId = c.req.param("id");

    const removed = await removeSandboxTerminal(sandbox, txId);
    return c.json({removed}, 200);
  })
  .post("/terminal/create", requireSandboxMW, async (c) => {
    // create new terminal
    const sandbox = c.get("sandbox");
    const {connection, ...rest} = await TerminalRuntime.createNew(sandbox);
    return c.json(rest, 200);
  })
  .post("/terminal/connect", requireSandboxMW, async (c) => {
    const sandbox = c.get("sandbox");
    const result = await TerminalRuntime.createNew(sandbox);
    return c.json(result, 200);
  })
  .post(
    "/terminal/send",
    requireSandboxMW,
    zValidator("json", sendCommandJson),
    async (c) => {
      const sandbox = c.get("sandbox");
      const json = c.req.valid("json");
      const resp = await sendCommand(sandbox, json);

      return c.json(resp, 200);
    },
  )
  .get("/terminal/history", async (c) => {});
