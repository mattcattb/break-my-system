import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {createRouter} from "../../common/hono";
import {PlcRegistry} from "../../connections/plc-registry";
import {
  requireSandboxMW,
  type SandboxEnv,
} from "../../sandbox/sandbox.middleware";
import {
  closeSandbox,
  createSandbox,
  getSandboxSnapshot,
  listSandboxSnapshots,
} from "../../sandbox/sandbox.runtime";

const evaluateSourceSchema = z.object({
  source: z.string().trim().min(1).max(50_000),
});

export const plcController = createRouter<SandboxEnv>()
  .get("/sandbox/list", (c) => {
    return c.json({sandboxes: listSandboxSnapshots()}, 200);
  })
  .post("/sandbox", (c) => {
    return c.json(getSandboxSnapshot(createSandbox()), 201);
  })
  .use("/sandbox/:sandboxId", requireSandboxMW)
  .use("/sandbox/:sandboxId/*", requireSandboxMW)
  .get("/sandbox/:sandboxId", (c) => {
    return c.json(getSandboxSnapshot(c.get("sandbox")), 200);
  })
  .delete("/sandbox/:sandboxId", async (c) => {
    await closeSandbox(c.get("sandbox"));
    return c.json({removed: true}, 200);
  })
  .get("/sandbox/:sandboxId/status", (c) => {
    return c.json({status: PlcRegistry.getStatus(c.get("sandboxId"))}, 200);
  })
  .post(
    "/sandbox/:sandboxId/evaluate",
    zValidator("json", evaluateSourceSchema),
    async (c) => {
      const startedAt = performance.now();
      const result = await PlcRegistry.getOrCreate(
        c.get("sandboxId"),
      ).evaluate(c.req.valid("json").source);

      return c.json(
        {
          ...result,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          ranAt: new Date().toISOString(),
        },
        200,
      );
    },
  )
  .post("/sandbox/:sandboxId/reset", async (c) => {
    await PlcRegistry.reset(c.get("sandboxId"));
    return c.json({status: "idle", resetAt: new Date().toISOString()}, 200);
  });
