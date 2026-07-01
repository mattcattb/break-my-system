import useReactWebSocket, {ReadyState} from "react-use-websocket";

const statusByReadyState = {
  [ReadyState.CONNECTING]: "Connecting",
  [ReadyState.OPEN]: "Connected",
  [ReadyState.CLOSING]: "Closing",
  [ReadyState.CLOSED]: "Closed",
  [ReadyState.UNINSTANTIATED]: "Idle",
} as const;

export const resolveWebSocketOrigin = () => {
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

export const createWebSocketUrl = (path = "/ws") =>
  new URL(path, resolveWebSocketOrigin()).toString();

export function useWebsocket(enabled = true) {
  const {readyState, sendJsonMessage, lastJsonMessage} = useReactWebSocket(
    createWebSocketUrl(),
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

  return {
    readyState,
    status: statusByReadyState[readyState],
    isConnected: readyState === ReadyState.OPEN,
    lastJsonMessage,
    sendJsonMessage,
  };
}
