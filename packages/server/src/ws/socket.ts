import type {WSContext} from "hono/ws";
import type {ServerMessage} from "./ws.messages";
import type {ServerWebSocket} from "bun";

export type RawWebSocket = ServerWebSocket<unknown>;

export type AppWebSocket = WSContext<RawWebSocket>;

export type SocketSession = {
  id: string;
  sandboxId: string;
  attachedToolIds: Set<string>;
};

export type MessageContext = {
  socket: AppWebSocket;
  session: SocketSession;
};

export function sendMessage(socket: WSContext, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}

export function requireSocketContext(socket: AppWebSocket) {
  const socketData = socket.raw;
  if (!socketData) {
    throw new Error("Raw socket not available");
  }

  return socketData;
}

export const TOPICS = {
  tool: (toolId: string) => `tool:${toolId}`,
  sandbox: (sandboxId: string) => `sandbox:${sandboxId}`,
};
