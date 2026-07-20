import {upgradeWebSocket} from "hono/bun";
import type {Context} from "hono";
import {createRouter} from "../common/hono";
import {
  minesweeperClient,
  toMinesweeperServerMessage,
} from "./minesweeper.client";
import {
  minesweeperClientMessageSchema,
  type MinesweeperServerMessage,
} from "./minesweeper.ws.messages";
import {
  attachMinesweeperConnection,
  detachMinesweeperConnection,
  touchMinesweeperWorkspace,
} from "./minesweeper.workspace";
import {
  requireMinesweeperWorkspaceMW,
  type MinesweeperWorkspaceEnv,
} from "./minesweeper.workspace.middleware";

type MinesweeperSocketSession = {
  kind: "minesweeper";
  connectionId: string;
};

type MinesweeperSocket = {send(data: string): void};

const workspaceSockets = new Map<
  string,
  Map<string, MinesweeperSocket>
>();

const sendMinesweeperMessage = (
  socket: MinesweeperSocket,
  message: MinesweeperServerMessage,
) => socket.send(JSON.stringify(message));

const registerSocket = (
  workspaceId: string,
  connectionId: string,
  socket: MinesweeperSocket,
) => {
  const sockets = workspaceSockets.get(workspaceId) ?? new Map();
  sockets.set(connectionId, socket);
  workspaceSockets.set(workspaceId, sockets);
};

const unregisterSocket = (workspaceId: string, connectionId: string) => {
  const sockets = workspaceSockets.get(workspaceId);
  sockets?.delete(connectionId);
  if (sockets?.size === 0) workspaceSockets.delete(workspaceId);
};

const parseJsonMessage = (message: string) => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

export const minesweeperWsController = createRouter().get(
  "/workspaces/:workspaceId",
  requireMinesweeperWorkspaceMW,
  upgradeWebSocket((c: Context<MinesweeperWorkspaceEnv>) => {
    const workspace = c.get("minesweeperWorkspace");
    const session: MinesweeperSocketSession = {
      kind: "minesweeper",
      connectionId: crypto.randomUUID(),
    };

    return {
      onOpen: (_event, socket) => {
        attachMinesweeperConnection(workspace, session.connectionId);
        registerSocket(workspace.id, session.connectionId, socket);
        sendMinesweeperMessage(socket, {
          type: "socket.ready",
          payload: {
            protocolVersion: 1,
          },
        });
      },
      onMessage: async (event, socket) => {
        touchMinesweeperWorkspace(workspace);
        const result = minesweeperClientMessageSchema.safeParse(
          parseJsonMessage(event.data.toString()),
        );

        if (!result.success) {
          sendMinesweeperMessage(socket, {
            type: "error",
            payload: {
              code: "BAD_REQUEST",
              message: "Invalid Minesweeper WebSocket message",
            },
          });
          return;
        }

        if (result.data.type === "ping") {
          sendMinesweeperMessage(socket, {type: "pong"});
          return;
        }

        try {
          const runtimeEvent = await minesweeperClient.send(
            workspace.id,
            session.connectionId,
            result.data,
          );
          const message = toMinesweeperServerMessage(runtimeEvent);
          if (
            runtimeEvent.type === "game.snapshot" &&
            runtimeEvent.audience === "game"
          ) {
            for (const subscriber of workspaceSockets.get(workspace.id)?.values() ?? []) {
              sendMinesweeperMessage(subscriber, message);
            }
          } else {
            sendMinesweeperMessage(socket, message);
          }
        } catch (error) {
          sendMinesweeperMessage(socket, {
            type: "error",
            payload: {
              code: "SYSTEM_UNAVAILABLE",
              message:
                error instanceof Error
                  ? error.message
                  : "The Minesweeper runtime is unavailable",
            },
          });
        }
      },
      onClose: () => {
        detachMinesweeperConnection(workspace, session.connectionId);
        unregisterSocket(workspace.id, session.connectionId);
      },
    };
  }),
);
