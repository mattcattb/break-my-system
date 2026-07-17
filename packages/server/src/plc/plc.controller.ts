import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {createRouter} from "../common/hono";
import {
  closePlcWorkspace,
  createPlcWorkspace,
  getPlcWorkspaceSnapshot,
  listPlcWorkspaceSnapshots,
} from "./plc.workspace";
import {requirePlcWorkspaceMW, type PlcWorkspaceEnv} from "./plc.workspace.middleware";

const evaluateSourceSchema = z.object({
  source: z.string().trim().min(1).max(50_000),
});

export const plcController = createRouter<PlcWorkspaceEnv>()
  .get("/workspaces", (c) =>
    c.json({workspaces: listPlcWorkspaceSnapshots()}, 200),
  )
  .post("/workspaces", async (c) => {
    const workspace = await createPlcWorkspace();
    return c.json(getPlcWorkspaceSnapshot(workspace), 201);
  })
  .use("/workspaces/:workspaceId", requirePlcWorkspaceMW)
  .use("/workspaces/:workspaceId/*", requirePlcWorkspaceMW)
  .get("/workspaces/:workspaceId", (c) =>
    c.json(getPlcWorkspaceSnapshot(c.get("plcWorkspace")), 200),
  )
  .delete("/workspaces/:workspaceId", async (c) => {
    await closePlcWorkspace(c.get("plcWorkspace"));
    return c.json({removed: true}, 200);
  })
  .post(
    "/workspaces/:workspaceId/evaluate",
    zValidator("json", evaluateSourceSchema),
    async (c) => {
      const startedAt = performance.now();
      const result = await c
        .get("plcWorkspace")
        .client.evaluate(c.req.valid("json").source);
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
  .post("/workspaces/:workspaceId/reset", async (c) => {
    const workspace = c.get("plcWorkspace");
    await workspace.client.reset();
    return c.json(
      {
        status: workspace.client.getStatus(),
        resetAt: new Date().toISOString(),
      },
      200,
    );
  });
