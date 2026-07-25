import type {
  MinesweeperCommand,
  MinesweeperError,
  MinesweeperGameSnapshot,
} from "@break-my-system/minesweeper-client/types";

export type MinesweeperClientMessage =
  | {type: "ping"}
  | MinesweeperCommand;

export type MinesweeperServerMessage =
  | {
      type: "socket.ready";
      payload: {protocolVersion: 1};
    }
  | {
      type: "game.snapshot";
      payload: MinesweeperGameSnapshot;
    }
  | {
      type: "error";
      payload: MinesweeperError;
    }
  | {type: "pong"};
