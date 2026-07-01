import {createRouter} from "../common/hono";
import {requireSandboxMW} from "./sandbox.middleware";
import {getTerminals} from "./sandbox.runtime";

export const sandboxController = createRouter()
  .get("/", requireSandboxMW, async (c) => {})
  .post("/", requireSandboxMW, async (c) => {
    // create a sandbox
  })
  .get("/terminals", requireSandboxMW, async (c) => {
    const sId = c.get("sandboxId");
    const data = getTerminals(sId);
    return c.json(data, 200);
  })
  .get("/terminal/:id", requireSandboxMW, async (c) => {})
  .post("/terminal/create", async (c) => {
    // create new terminal
  })
  .post("/terminal/connect", async (c) => {})
  .post("/terminal/send", async (c) => {})
  .get("/terminal/history", async (c) => {});
