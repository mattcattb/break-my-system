import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {createRouter} from "../common/hono";
import {ServiceException} from "../common/errors";
import {minesweeperClient} from "./minesweeper.client";
import {
  closeMinesweeperWorkspace,
  createMinesweeperWorkspace,
  getMinesweeperWorkspaceSnapshot,
  listMinesweeperWorkspaceSnapshots,
} from "./minesweeper.workspace";
import {
  requireMinesweeperWorkspaceMW,
  type MinesweeperWorkspaceEnv,
} from "./minesweeper.workspace.middleware";

const createWorkspaceSchema = z
  .object({
    rows: z.number().int().min(2).max(100),
    cols: z.number().int().min(2).max(100),
    mines: z.number().int().positive(),
  })
  .strict()
  .refine(({rows, cols, mines}) => mines < rows * cols, {
    message: "Mine count must be smaller than the number of tiles",
    path: ["mines"],
  });

const leaderboardEntries: {name: string; seconds: number}[] = [];

export const minesweeperController =
  createRouter<MinesweeperWorkspaceEnv>()
    .get("/leaderboard", (c) => c.json({entries: leaderboardEntries}, 200))
    .get("/workspaces", (c) =>
      c.json({workspaces: listMinesweeperWorkspaceSnapshots()}, 200),
    )
    .post(
      "/workspaces",
      zValidator("json", createWorkspaceSchema),
      async (c) => {
        const config = c.req.valid("json");
        const workspace = createMinesweeperWorkspace(config);
        try {
          const event = await minesweeperClient.createGame(workspace.id, config);
          if (event.type === "error") {
            throw new Error(event.payload.message);
          }
          return c.json(getMinesweeperWorkspaceSnapshot(workspace), 201);
        } catch (error) {
          closeMinesweeperWorkspace(workspace);
          throw new ServiceException(
            error instanceof Error
              ? `Minesweeper runtime unavailable: ${error.message}`
              : "Minesweeper runtime unavailable",
          );
        }
      },
    )
    .use("/workspaces/:workspaceId", requireMinesweeperWorkspaceMW)
    .use("/workspaces/:workspaceId/*", requireMinesweeperWorkspaceMW)
    .get("/workspaces/:workspaceId", (c) =>
      c.json(
        getMinesweeperWorkspaceSnapshot(c.get("minesweeperWorkspace")),
        200,
      ),
    )
    .delete("/workspaces/:workspaceId", (c) => {
      closeMinesweeperWorkspace(c.get("minesweeperWorkspace"));
      return c.json({removed: true}, 200);
    });
