import {upgradeWebSocket} from "hono/bun";
import type {Context} from "hono";
import {createRouter} from "../common/hono";
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
  workspaceId: string;
  connectionId: string;
};

const sendMinesweeperMessage = (
  socket: {send(data: string): void},
  message: MinesweeperServerMessage,
) => socket.send(JSON.stringify(message));

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
      workspaceId: workspace.id,
      connectionId: crypto.randomUUID(),
    };

    return {
      onOpen: (_event, socket) => {
        attachMinesweeperConnection(workspace, session.connectionId);
        sendMinesweeperMessage(socket, {
          type: "socket.ready",
          payload: {
            gameId: session.workspaceId,
            connectionId: session.connectionId,
            protocolVersion: 1,
          },
        });
      },
      onMessage: (event, socket) => {
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

        sendMinesweeperMessage(socket, {
          type: "error",
          requestId: result.data.requestId,
          payload: {
            code: "SYSTEM_UNAVAILABLE",
            message: "The Minesweeper system transport is not connected yet",
          },
        });
      },
      onClose: () => {
        detachMinesweeperConnection(workspace, session.connectionId);
      },
    };
  }),
);
