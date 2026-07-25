import type {
  MinesweeperClientMessage,
  MinesweeperServerMessage,
} from "@break-my-system/server";
import {useCallback, useEffect, useState} from "react";
import useReactWebSocket, {ReadyState} from "react-use-websocket";
import {
  createWebSocketUrl,
  webSocketStatusByReadyState,
} from "../../hooks/useWebsocket";

type GameSnapshot = Extract<
  MinesweeperServerMessage,
  {type: "game.snapshot"}
>["payload"];
type GameError = Extract<
  MinesweeperServerMessage,
  {type: "error"}
>["payload"];

export const useMinesweeperClient = (workspaceId?: string) => {
  const enabled = Boolean(workspaceId);
  const [snapshot, setSnapshot] = useState<GameSnapshot>();
  const [lastError, setLastError] = useState<GameError>();
  const {readyState, sendJsonMessage, lastJsonMessage} =
    useReactWebSocket<MinesweeperServerMessage>(
      workspaceId
        ? createWebSocketUrl(
            `/ws/minesweeper/workspaces/${encodeURIComponent(workspaceId)}`,
          )
        : null,
      {
        share: true,
        shouldReconnect: () => enabled,
        reconnectAttempts: 10,
        reconnectInterval: 3_000,
        heartbeat: {
          message: JSON.stringify({type: "ping"}),
          returnMessage: JSON.stringify({type: "pong"}),
          timeout: 60_000,
          interval: 25_000,
        },
      },
      enabled,
    );

  const sendCommand = useCallback(
    (message: MinesweeperClientMessage) => {
      if (readyState === ReadyState.OPEN) sendJsonMessage(message);
    },
    [readyState, sendJsonMessage],
  );
  const revealTile = useCallback(
    (row: number, col: number) =>
      sendCommand({type: "tile.reveal", payload: {row, col}}),
    [sendCommand],
  );
  const toggleFlag = useCallback(
    (row: number, col: number) =>
      sendCommand({type: "tile.flag.toggle", payload: {row, col}}),
    [sendCommand],
  );
  const restartGame = useCallback(
    () => sendCommand({type: "game.restart"}),
    [sendCommand],
  );
  const resyncGame = useCallback(
    () => sendCommand({type: "game.resync"}),
    [sendCommand],
  );

  useEffect(() => {
    if (!lastJsonMessage) return;

    if (lastJsonMessage.type === "socket.ready") {
      setSnapshot(undefined);
      resyncGame();
      return;
    }

    if (lastJsonMessage.type === "game.snapshot") {
      setSnapshot(lastJsonMessage.payload);
      return;
    }

    if (lastJsonMessage.type === "error") {
      setLastError(lastJsonMessage.payload);
    }
  }, [lastJsonMessage, resyncGame]);

  return {
    status: webSocketStatusByReadyState[readyState],
    isConnected: readyState === ReadyState.OPEN,
    snapshot,
    lastError,
    revealTile,
    toggleFlag,
    restartGame,
    resyncGame,
  };
};
