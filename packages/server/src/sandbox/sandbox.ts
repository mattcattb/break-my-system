import type {Tool} from "./tool";

export class Sandbox {
  public readonly id = crypto.randomUUID();
  public readonly createdAt = new Date().toISOString();
  public lastSeenAt = this.createdAt;
  private tools = new Map<string, Tool>();
  private connectionIds = new Set<string>();

  touch() {
    this.lastSeenAt = new Date().toISOString();
  }

  addConnection(connectionId: string) {
    this.connectionIds.add(connectionId);
    this.touch();
  }

  getConnectionIds() {
    return [...this.connectionIds];
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
