import {describe, expect, test} from "bun:test";
import {
  minesweeperClientMessageSchema,
  minesweeperServerMessageSchema,
} from "./minesweeper.ws.messages";

describe("Minesweeper WebSocket messages", () => {
  test("accepts a reveal command", () => {
    expect(
      minesweeperClientMessageSchema.safeParse({
        type: "tile.reveal",
        payload: {row: 2, col: 3},
      }).success,
    ).toBe(true);
  });

  test("rejects invalid coordinates", () => {
    expect(
      minesweeperClientMessageSchema.safeParse({
        type: "tile.reveal",
        payload: {row: -1, col: 3},
      }).success,
    ).toBe(false);
  });

  test("rejects transport identifiers from browser commands", () => {
    expect(
      minesweeperClientMessageSchema.safeParse({
        type: "tile.reveal",
        requestId: "request-1",
        connectionId: "connection-1",
        payload: {row: 2, col: 3},
      }).success,
    ).toBe(false);
  });

  test("accepts workspace-scoped socket readiness", () => {
    expect(
      minesweeperServerMessageSchema.safeParse({
        type: "socket.ready",
        payload: {protocolVersion: 1},
      }).success,
    ).toBe(true);
  });

  test("accepts hidden and revealed tile snapshots", () => {
    expect(
      minesweeperServerMessageSchema.safeParse({
        type: "game.snapshot",
        payload: {
          revision: 4,
          status: "playing",
          elapsedSeconds: 12,
          remainingMines: 9,
          rows: 1,
          cols: 2,
          tiles: [
            {row: 0, col: 0, state: "hidden", flagged: false},
            {row: 0, col: 1, state: "revealed", value: 2},
          ],
        },
      }).success,
    ).toBe(true);
  });

  test("does not allow hidden tiles to expose mine data", () => {
    expect(
      minesweeperServerMessageSchema.safeParse({
        type: "game.snapshot",
        payload: {
          revision: 0,
          status: "playing",
          elapsedSeconds: 0,
          remainingMines: 1,
          rows: 1,
          cols: 1,
          tiles: [
            {
              row: 0,
              col: 0,
              state: "hidden",
              flagged: false,
              value: "mine",
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
});
