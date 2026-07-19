import {afterAll, describe, expect, spyOn, test} from "bun:test";
import {
  attachMinesweeperConnection,
  closeMinesweeperWorkspace,
  createMinesweeperWorkspace,
  detachMinesweeperConnection,
  getMinesweeperWorkspaceSnapshot,
  requireMinesweeperWorkspace,
} from "./minesweeper.workspace";
import {minesweeperController} from "./minesweeper.controller";
import {minesweeperClient} from "./minesweeper.client";

const createGame = spyOn(minesweeperClient, "createGame").mockResolvedValue({
  type: "game.snapshot",
  audience: "game",
  gameId: "test-game",
  connectionId: "",
  requestId: "test-request",
  payload: {
    revision: 0,
    status: "playing",
    elapsedSeconds: 0,
    remainingMines: 10,
    rows: 9,
    cols: 9,
    tiles: [],
  },
});

afterAll(() => createGame.mockRestore());

describe("Minesweeper workspaces", () => {
  test("stores API metadata without storing game state", () => {
    const workspace = createMinesweeperWorkspace({
      rows: 16,
      cols: 30,
      mines: 99,
    });

    attachMinesweeperConnection(workspace, "connection-1");
    expect(getMinesweeperWorkspaceSnapshot(workspace)).toMatchObject({
      id: workspace.id,
      gameId: workspace.id,
      rows: 16,
      cols: 30,
      mines: 99,
      activeConnections: 1,
    });

    detachMinesweeperConnection(workspace, "connection-1");
    expect(getMinesweeperWorkspaceSnapshot(workspace).activeConnections).toBe(0);

    closeMinesweeperWorkspace(workspace);
    expect(() => requireMinesweeperWorkspace(workspace.id)).toThrow();
  });

  test("creates and removes a workspace through the API", async () => {
    const createResponse = await minesweeperController.request("/workspaces", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({rows: 9, cols: 9, mines: 10}),
    });
    expect(createResponse.status).toBe(201);

    const created = (await createResponse.json()) as {id: string};
    const getResponse = await minesweeperController.request(
      `/workspaces/${created.id}`,
    );
    expect(getResponse.status).toBe(200);

    const removeResponse = await minesweeperController.request(
      `/workspaces/${created.id}`,
      {method: "DELETE"},
    );
    expect(removeResponse.status).toBe(200);
  });

  test("rejects an impossible board", async () => {
    const response = await minesweeperController.request("/workspaces", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({rows: 2, cols: 2, mines: 4}),
    });

    expect(response.status).toBe(400);
  });

  test("returns the current leaderboard", async () => {
    const response = await minesweeperController.request("/leaderboard");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({entries: []});
  });
});
