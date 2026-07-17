import type {
  RedisClientMessage,
  RedisServerMessage,
} from "@break-my-system/server";
import {useCallback} from "react";
import useReactWebSocket, {ReadyState} from "react-use-websocket";

const statusByReadyState = {
  [ReadyState.CONNECTING]: "Connecting",
  [ReadyState.OPEN]: "Connected",
  [ReadyState.CLOSING]: "Closing",
  [ReadyState.CLOSED]: "Closed",
  [ReadyState.UNINSTANTIATED]: "Idle",
} as const;

const resolveWebSocketOrigin = () => {
  const envUrl = import.meta.env.VITE_WS_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:3000";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
};

const createWebSocketUrl = (path = "/ws") =>
  new URL(path, resolveWebSocketOrigin()).toString();

export function useRedisWebSocket(workspaceId?: string) {
  const enabled = Boolean(workspaceId);
  const {readyState, sendJsonMessage, lastJsonMessage} =
    useReactWebSocket<RedisServerMessage>(
      workspaceId
        ? createWebSocketUrl(
            `/ws/redis/workspaces/${encodeURIComponent(workspaceId)}`,
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

  const sendMessage = useCallback(
    (message: RedisClientMessage) => sendJsonMessage(message),
    [sendJsonMessage],
  );

  return {
    readyState,
    status: statusByReadyState[readyState],
    isConnected: readyState === ReadyState.OPEN,
    lastJsonMessage,
    sendMessage,
  };
}
