import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closeMinesweeperWorkspace,
  hasMinesweeperWorkspaceExpired,
  requireMinesweeperWorkspace,
  touchMinesweeperWorkspace,
  type MinesweeperWorkspace,
} from "./minesweeper.workspace";

export type MinesweeperWorkspaceEnv = {
  Variables: {
    minesweeperWorkspace: MinesweeperWorkspace;
    minesweeperWorkspaceId: string;
  };
};

export const requireMinesweeperWorkspaceMW =
  createMiddleware<MinesweeperWorkspaceEnv>(async (c, next) => {
    const workspaceId = c.req.param("workspaceId");
    if (!workspaceId) {
      throw new NotFoundException({
        appCode: "MINESWEEPER_WORKSPACE_NOT_FOUND",
      });
    }

    const workspace = requireMinesweeperWorkspace(workspaceId);
    if (hasMinesweeperWorkspaceExpired(workspace)) {
      closeMinesweeperWorkspace(workspace);
      throw new NotFoundException({
        appCode: "MINESWEEPER_WORKSPACE_EXPIRED",
        details: {workspaceId},
      });
    }

    touchMinesweeperWorkspace(workspace);
    c.set("minesweeperWorkspace", workspace);
    c.set("minesweeperWorkspaceId", workspace.id);
    await next();
  });
