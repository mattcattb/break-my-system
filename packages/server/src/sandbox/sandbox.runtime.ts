import {type RedisClientType} from "redis";
import {ConflictException, NotFoundException} from "../common/errors";
import type {Terminal} from "./terminal.runtime";

const MAX_TERMINALS_PER_SANDBOX = 4;
const SANDBOX_IDLE_MS = 10 * 60 * 1000;
const SANDBOX_TTL_MS = 60 * 60 * 1000;
const MAX_COMMAND_LENGTH = 2_000;

type ClientState = "none" | "disconnected" | "connected" | "connecting";

export type Sandbox = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  terminals: Map<string, Terminal>;
};

const sandboxeMap = new Map<string, Sandbox>();

export function getClientStatus(client: RedisClientType | null): ClientState {
  if (!client) return "none";
  if (client.isReady) return "connected";
  if (client.isOpen) return "connecting";
  return "disconnected";
}

export const getSandbox = (tId: string): Sandbox | null => {
  // if past, delete
  return sandboxeMap.get(tId) ?? null;
};

export const requireSandbox = (sandboxId: string): Sandbox => {
  const sandbox = getSandbox(sandboxId);
  if (!sandbox)
    throw new NotFoundException(`Sandbox ${sandboxId} does not exist`);
  return sandbox;
};

export const closeSandbox = async (sandboxId: string) => {
  const sandbox = sandboxeMap.get(sandboxId);
  if (!sandbox) return false;

  // close all terminals
  for (const [txid, terminal] of sandbox.terminals) {
    await closeTerminal(terminal);
    sandbox.terminals.delete(txid);
  }
};

export const getTerminals = (sId: string) => {
  const sandbox = requireSandbox(sId);
  const terminals = sandbox.terminals;

  const terminalData = [];
  for (const [tId, term] of terminals) {
    const {connection, ...rest} = term;
    const termDate = {...rest, state: getClientStatus(connection)};
    terminalData.push(termDate);
  }

  return terminalData;
};

export const connectTerminalClient = async (sId: string, tId: string) => {};

export const closeTerminal = async (t: Terminal) => {
  if (t.connection) {
    await t.connection.close();
  }
  t.connection = null;
};

export const getRequiredTerminal = (s: Sandbox, tId: string) => {
  const t = s.terminals.get(tId);

  if (!t) {
    throw new NotFoundException("Terminal does not exist!");
  }

  t.lastUsed = new Date().toISOString();

  return t;
};

export const sendCommand = async (
  sId: string,
  tId: string,
  command: string[],
) => {
  // !ARGGGG RAAA

  const sandbox = requireSandbox(sId);

  const term = getRequiredTerminal(sandbox, tId);

  if (term.connection?.isReady) {
    throw new ConflictException("client is not in ready connected state");
  }

  const resp = await term.connection?.sendCommand(command);

  return {
    requestCommand: command,
    response: resp,
  };
};
