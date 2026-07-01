import type {RedisClientType} from "redis";
import type {Sandbox} from "./sandbox.runtime";

export type TermClientState =
  | "none"
  | "disconnected"
  | "connected"
  | "connecting";

export type Terminal = {
  id: string;
  createdAt: string;
  lastUsed: string;
  connection: RedisClientType | null;
  commandCount: number;
  state: TermClientState;
};

export const TerminalRuntime = {
  async createNew(sandbox?: Sandbox): Promise<Terminal> {
    const now = new Date().toISOString();
    const terminal: Terminal = {
      connection: null,
      createdAt: now,
      lastUsed: now,
      state: "none",
      id: crypto.randomUUID(),
      commandCount: 0,
    };
    if (sandbox) {
      sandbox.terminals.set(terminal.id, terminal);
    }

    return terminal;
  },

  async connect(terminal: Terminal) {},

  async requireTerminalConnection(terminal: Terminal, url?: string) {},

  async runCommand(terminal: Terminal, command: string[]) {},
};
