import {TerminalEmitter} from "../systems/redis/command-terminal/command-terminal";
import {requireSocketContext, TOPICS} from "../ws/socket";
import type {createSocketRouter} from "../ws/ws.router";

export const registerToolHandlers = (
  wsRouter: ReturnType<typeof createSocketRouter>,
) => {
  wsRouter.on("tool.detatch", async ({session, socket}, data) => {});
  wsRouter.on("tool.attach", async ({session, socket}, data) => {
    const {
      payload: {afterSequence},
      toolId,
      requestId,
    } = data;

    const raw = requireSocketContext(socket);
    raw.subscribe(TOPICS.tool(toolId));
    session.attachedToolIds.add(toolId);

    TerminalEmitter.emit({
      type: "tool.attached",
      requestId,
      toolId,
    });
  });
};
