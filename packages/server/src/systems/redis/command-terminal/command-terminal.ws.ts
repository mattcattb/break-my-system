import {getSandbox} from "../../../sandbox/sandbox.runtime";
import {sendMessage} from "../../../ws/socket";
import type {createSocketRouter} from "../../../ws/ws.router";
import {executeCommandTerminal} from "./command-terminal";

export const registerCommandTerminalHandlers = (
  wsRouter: ReturnType<typeof createSocketRouter>,
) => {
  wsRouter.on("terminal.command", async ({session, socket}, data) => {
    const {payload, requestId, toolId} = data;
    const sandbox = getSandbox(session.sandboxId);

    if (!session.attachedToolIds.has(toolId)) {
      sendMessage(socket, {
        type: "error",
        requestId,
        toolId,
        payload: {
          code: "Terminal not ready",
          message: "Attach the terminal before sending commands",
        },
      });
      return;
    }

    if (!sandbox) {
      sendMessage(socket, {
        type: "error",
        requestId,
        toolId,
        payload: {code: "Sandbox not found", message: "Sandbox not found"},
      });
      return;
    }

    try {
      const resp = await executeCommandTerminal(sandbox, toolId, payload.input);

      sendMessage(socket, {
        type: "terminal.command.result",
        occurredAt: resp.completedAt ?? new Date().toISOString(),
        requestId,
        toolId,
        payload: {lines: resp.outputLines},
        sequence: 0,
      });
    } catch (error) {
      sendMessage(socket, {
        type: "error",
        requestId,
        toolId,
        payload: {
          code: "Bad Request",
          message: error instanceof Error ? error.message : "Command failed",
        },
      });
    }
  });
};
