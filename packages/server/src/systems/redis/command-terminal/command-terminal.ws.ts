import {getSandbox} from "../../../sandbox/sandbox.runtime";
import {sendMessage} from "../../../ws/socket";
import type {createSocketRouter} from "../../../ws/ws.router";
import {executeCommandTerminal} from "./command-terminal";

export const registerCommandTerminalHandlers = (
  wsRouter: ReturnType<typeof createSocketRouter>,
) => {
  wsRouter.on("terminal.command", async ({session, socket}, data) => {
    const {payload, requestId, terminalId} = data;
    const sandbox = getSandbox(session.sandboxId);

    if (!session.attachedToolIds.has(terminalId)) {
      // terminal not attached for command?
      return;
    }

    if (!sandbox) return; //? handle no connected command here?

    const resp = await executeCommandTerminal(
      sandbox,
      terminalId,
      payload.input,
    );

    sendMessage(socket, {
      type: "terminal.command.result",
      occuredAt: resp.completedAt ?? new Date().toString(),
      requestId: requestId,
      toolId: terminalId,
      payload: {lines: resp.outputLines},
      sequence: 0,
    });
  });
};
