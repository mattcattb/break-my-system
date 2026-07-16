import {createBunWebSocket, upgradeWebSocket} from "hono/bun";
import type {WSMessageReceive} from "hono/ws";
import {createRouter} from "../common/hono";
import {requireSandboxMW, type SandboxEnv} from "../sandbox/sandbox.middleware";
import type {Context} from "hono";
import {
  requireSocketContext,
  sendMessage,
  TOPICS,
  type SocketSession,
} from "./socket";
import {createSocketRouter} from "./ws.router";
import {clientMessagesSchema} from "./ws.messages";
import {registerToolHandlers} from "../tools/tool.ws";
import {registerCommandTerminalHandlers} from "../systems/redis/command-terminal/command-terminal.ws";

const parseJsonMessage = (message: string) => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

const router = createSocketRouter();

registerToolHandlers(router);
registerCommandTerminalHandlers(router);

export const wsController = createRouter().get(
  "/:sandboxId",
  requireSandboxMW,
  upgradeWebSocket((c: Context<SandboxEnv>) => {
    const sandbox = c.get("sandbox");

    const session: SocketSession = {
      attachedToolIds: new Set(),
      sandboxId: sandbox.id,
      id: crypto.randomUUID(),
    };

    return {
      onOpen: (_event, ws) => {
        ws.raw.data = session;

        const raw = requireSocketContext(ws);
        raw.subscribe(TOPICS.sandbox(sandbox.id));

        ws.send(
          JSON.stringify({
            type: "socket.ready",
            payload: {message: "Connected to break-my-system"},
          }),
        );
      },
      onMessage: async (event, ws) => {
        const json = parseJsonMessage(event.data.toString());
        const clientParseResult = clientMessagesSchema.safeParse(json);

        if (clientParseResult.error) {
          //! send error message
          sendMessage(ws, {
            type: "error",
            payload: {
              code: "Bad Request",
              message: `invalid client request message`,
            },
          });
          return;
        }

        const message = clientParseResult.data;
        await router.dispatch({session, socket: ws}, message);
      },
      onError(evt, ws) {},
      onClose(evt, ws) {
        const raw = requireSocketContext(ws);

        for (const tId of session.attachedToolIds) {
          raw.unsubscribe(TOPICS.tool(tId));
        }

        session.attachedToolIds.clear();
        raw.unsubscribe(TOPICS.sandbox(session.sandboxId));
      },
    };
  }),
);
