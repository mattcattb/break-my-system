import type {RedisClientType} from "redis";

export type TermClientState =
  | "none"
  | "disconnected"
  | "connected"
  | "connecting"
  | "executing";

/*
export class Terminal {
  public id: string;
  public createdAt: Date;
  public lastUsed: Date;

  public state: TermClientState;
  public connection: RedisClientType | null

  constructor() {}


  async close() {
    if this.
  }

  async requireClient(){}

  hasExpired(): boolean {}
}
*/
