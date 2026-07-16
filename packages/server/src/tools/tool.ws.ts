import {requireTool} from "../sandbox/sandbox";
import {getSandbox} from "../sandbox/sandbox.runtime";
import {requireSocketContext, sendMessage, TOPICS} from "../ws/socket";
import type {createSocketRouter} from "../ws/ws.router";

export const registerToolHandlers = (
  wsRouter: ReturnType<typeof createSocketRouter>,
) => {
  wsRouter.on("tool.detach", async ({session, socket}, data) => {
    const raw = requireSocketContext(socket);
    raw.unsubscribe(TOPICS.tool(data.toolId));
    session.attachedToolIds.delete(data.toolId);
    sendMessage(socket, {
      type: "tool.detached",
      requestId: data.requestId,
      toolId: data.toolId,
    });
  });
  wsRouter.on("tool.attach", async ({session, socket}, data) => {
    const {toolId, requestId} = data;
    const sandbox = getSandbox(session.sandboxId);

    if (!sandbox) return;

    requireTool(sandbox, toolId);

    const raw = requireSocketContext(socket);
    raw.subscribe(TOPICS.tool(toolId));
    session.attachedToolIds.add(toolId);

    sendMessage(socket, {
      type: "tool.attached",
      requestId,
      toolId,
    });
  });
};
