import {
  minesweeperServerMessageSchema,
  type MinesweeperClientMessage,
} from "@break-my-system/server";
import {useCallback, useMemo} from "react";
import useReactWebSocket, {ReadyState} from "react-use-websocket";
import {
  createWebSocketUrl,
  webSocketStatusByReadyState,
} from "../../hooks/useWebsocket";

export const useMinesweeperWs = (workspaceId?: string) => {
  const enabled = Boolean(workspaceId);
  const {readyState, sendJsonMessage, lastJsonMessage} =
    useReactWebSocket<unknown>(
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

  const lastMessage = useMemo(() => {
    const result = minesweeperServerMessageSchema.safeParse(lastJsonMessage);
    return result.success ? result.data : null;
  }, [lastJsonMessage]);

  const sendMessage = useCallback(
    (message: MinesweeperClientMessage) => sendJsonMessage(message),
    [sendJsonMessage],
  );

  return {
    readyState,
    status: webSocketStatusByReadyState[readyState],
    isConnected: readyState === ReadyState.OPEN,
    lastMessage,
    sendMessage,
  };
};
