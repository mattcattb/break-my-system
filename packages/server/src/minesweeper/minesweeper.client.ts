import {
  MinesweeperClient,
  type MinesweeperRuntimeEvent,
} from "@break-my-system/minesweeper-client";
import {appEnv} from "../common/env";
import type {MinesweeperServerMessage} from "./minesweeper.ws.types";

const getMinesweeperEndpoint = () => {
  const value =
    appEnv.MINESWEEPER_URL ??
    (appEnv.NODE_ENV === "production"
      ? undefined
      : "minesweeper://127.0.0.1:27575");

  if (!value) {
    throw new Error("MINESWEEPER_URL is required in production");
  }
  return value;
};

export const toMinesweeperServerMessage = (
  event: MinesweeperRuntimeEvent,
): MinesweeperServerMessage =>
  event.type === "game.snapshot"
    ? {type: "game.snapshot", payload: event.payload}
    : {type: "error", payload: event.payload};

export const minesweeperClient = new MinesweeperClient({
  endpoint: getMinesweeperEndpoint(),
});
