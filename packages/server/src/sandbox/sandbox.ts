import {ConflictException, NotFoundException} from "../common/errors";
import type {Tool} from "../tools/tool";

export function requireTool(sandbox: Sandbox, toolId: string): Tool;
export function requireTool<K extends Tool["kind"]>(
  sandbox: Sandbox,
  toolId: string,
  expectedKind: K,
): Extract<Tool, {kind: K}>;
export function requireTool(
  sandbox: Sandbox,
  toolId: string,
  expectedKind?: Tool["kind"],
): Tool {
  const tool = sandbox.getTool(toolId);
  if (!tool) {
    throw new NotFoundException({
      appCode: "TOOL_NOT_FOUND",
      details: {
        toolId,
        ...(expectedKind && {expectedKind}),
      },
    });
  }

  if (expectedKind && tool.kind !== expectedKind) {
    throw new ConflictException({
      appCode: "CONFLICT_TOOL_TYPE",
      details: {
        toolId,
        expectedKind,
        actualKind: tool.kind,
      },
    });
  }

  return tool;
}

export class Sandbox {
  public readonly id = crypto.randomUUID();
  public readonly createdAt = new Date().toISOString();
  public lastSeenAt = this.createdAt;
  private tools = new Map<string, Tool>();

  touch() {
    this.lastSeenAt = new Date().toISOString();
  }

  addTool(tool: Tool) {
    this.tools.set(tool.id, tool);
    this.touch();
  }

  getTool(toolId: string) {
    return this.tools.get(toolId) ?? null;
  }

  removeTool(toolId: string) {
    const tool = this.tools.get(toolId) ?? null;

    if (!tool) {
      return null;
    }

    this.tools.delete(toolId);
    this.touch();

    return tool;
  }

  getTools() {
    return [...this.tools.values()];
  }
}
