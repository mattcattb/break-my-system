import {createBunWebSocket} from "hono/bun";
import type {WSMessageReceive} from "hono/ws";
import {createRouter} from "../common/hono";

const {upgradeWebSocket, websocket} = createBunWebSocket();

const toText = (message: WSMessageReceive) => {
  if (typeof message === "string") {
    return message;
  }

  return "binary";
};

const parseJsonMessage = (message: string) => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

export const wsController = createRouter().get(
  "/",
  upgradeWebSocket(() => ({
    onOpen: (_event, ws) => {
      ws.send(
        JSON.stringify({
          type: "socket.ready",
          payload: {message: "Connected to break-my-system"},
        }),
      );
    },
    onMessage: (event, ws) => {
      const message = toText(event.data);
      const json = parseJsonMessage(message);

      if (json?.type === "ping") {
        ws.send(JSON.stringify({type: "pong"}));
        return;
      }

      ws.send(
        JSON.stringify({
          type: "socket.echo",
          payload: {message, receivedAt: new Date().toISOString()},
        }),
      );
    },
  })),
);

export {websocket};
