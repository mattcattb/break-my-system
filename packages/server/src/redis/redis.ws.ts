import {upgradeWebSocket} from "hono/bun";
import type {Context} from "hono";
import {createRouter} from "../common/hono";
import {
  executeRedisTerminalCommand,
  requireRedisTerminal,
} from "./command-terminal";
import {
  redisClientMessagesSchema,
  type RedisServerMessage,
} from "./redis.ws.messages";
import {
  requireRedisWorkspaceMW,
  type RedisWorkspaceEnv,
} from "./redis.workspace.middleware";

type RedisSocketSession = {
  kind: "redis";
  workspaceId: string;
  attachedTerminalIds: Set<string>;
};

const sendRedisMessage = (
  socket: {send(data: string): void},
  message: RedisServerMessage,
) => socket.send(JSON.stringify(message));

const parseJsonMessage = (message: string) => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

export const redisWsController = createRouter().get(
  "/workspaces/:workspaceId",
  requireRedisWorkspaceMW,
  upgradeWebSocket((c: Context<RedisWorkspaceEnv>) => {
    const workspace = c.get("redisWorkspace");
    const session: RedisSocketSession = {
      kind: "redis",
      workspaceId: workspace.id,
      attachedTerminalIds: new Set(),
    };

    return {
      onOpen: (_event, socket) => {
        sendRedisMessage(socket, {
          type: "socket.ready",
          payload: {workspaceId: session.workspaceId},
        });
      },
      onMessage: async (event, socket) => {
        const result = redisClientMessagesSchema.safeParse(
          parseJsonMessage(event.data.toString()),
        );

        if (!result.success) {
          sendRedisMessage(socket, {
            type: "error",
            payload: {
              code: "BAD_REQUEST",
              message: "Invalid Redis WebSocket message",
            },
          });
          return;
        }

        const message = result.data;

        if (message.type === "ping") {
          sendRedisMessage(socket, {type: "pong"});
          return;
        }

        try {
          if (message.type === "terminal.attach") {
            requireRedisTerminal(workspace, message.terminalId);
            session.attachedTerminalIds.add(message.terminalId);
            sendRedisMessage(socket, {
              type: "terminal.attached",
              requestId: message.requestId,
              terminalId: message.terminalId,
            });
            return;
          }

          if (message.type === "terminal.detach") {
            session.attachedTerminalIds.delete(message.terminalId);
            sendRedisMessage(socket, {
              type: "terminal.detached",
              requestId: message.requestId,
              terminalId: message.terminalId,
            });
            return;
          }

          if (!session.attachedTerminalIds.has(message.terminalId)) {
            sendRedisMessage(socket, {
              type: "error",
              requestId: message.requestId,
              terminalId: message.terminalId,
              payload: {
                code: "TERMINAL_NOT_READY",
                message: "Attach the terminal before sending commands",
              },
            });
            return;
          }

          const execution = await executeRedisTerminalCommand(
            workspace,
            message.terminalId,
            message.payload.input,
          );
          sendRedisMessage(socket, {
            type: "terminal.command.result",
            requestId: message.requestId,
            terminalId: message.terminalId,
            occurredAt: execution.completedAt ?? new Date().toISOString(),
            payload: {lines: execution.outputLines},
          });
        } catch (error) {
          sendRedisMessage(socket, {
            type: "error",
            requestId: message.requestId,
            terminalId: message.terminalId,
            payload: {
              code: "BAD_REQUEST",
              message: error instanceof Error ? error.message : "Redis request failed",
            },
          });
        }
      },
      onClose: () => {
        session.attachedTerminalIds.clear();
      },
    };
  }),
);
