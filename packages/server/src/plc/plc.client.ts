export type PlcClientStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "closing"
  | "error";

type PendingRequest = {
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type PlcSocketState = {
  decoder: TextDecoder;
  buffer: string;
  pending: PendingRequest | null;
  outgoing: Buffer | null;
  outgoingOffset: number;
};

export type PlcEvaluationResult =
  | {
      ok: true;
      output: string;
      value: string;
    }
  | {
      ok: false;
      output: string;
      errorKind: string;
      message: string;
    };

const PLC_REQUEST_TIMEOUT_MS = 5_000;

export class PlcClient {
  private readonly config: {hostname: string; port: number};
  private socket: Bun.Socket<PlcSocketState> | null = null;
  private status: PlcClientStatus = "disconnected";
  private connectPromise: Promise<void> | null = null;
  private closePromise: Promise<void> | null = null;
  private finishClose: (() => void) | null = null;

  constructor(config: {hostname: string; port: number}) {
    this.config = config;
  }

  connect(): Promise<void> {
    if (this.status === "connected") {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (this.status === "closing") {
      return Promise.reject(new Error("PLC client is closing"));
    }

    this.status = "connecting";
    const attempt = Bun.connect<PlcSocketState>({
      hostname: this.config.hostname,
      port: this.config.port,
      data: {
        decoder: new TextDecoder(),
        buffer: "",
        pending: null,
        outgoing: null,
        outgoingOffset: 0,
      },
      socket: {
        data: (socket, bytes) => this.receiveData(socket, bytes),
        drain: (socket) => this.flushOutgoing(socket),
        error: (socket, error) => this.handleSocketError(socket, error),
        close: (socket) => this.handleSocketClose(socket),
      },
    })
      .then((socket) => {
        this.socket = socket;
        if (this.status === "closing") {
          socket.close();
          return;
        }
        this.status = "connected";
      })
      .catch((error: unknown) => {
        const connectionError =
          error instanceof Error
            ? error
            : new Error("Unable to connect to the PLC server");
        this.socket = null;
        if (this.status === "closing") {
          this.completeClose();
        } else {
          this.status = "error";
        }
        throw connectionError;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    this.connectPromise = attempt;
    return attempt;
  }

  close(): Promise<void> {
    if (this.status === "disconnected") {
      return Promise.resolve();
    }

    if (this.closePromise) {
      return this.closePromise;
    }

    this.status = "closing";
    const closing = new Promise<void>((resolve) => {
      this.finishClose = resolve;
    });
    this.closePromise = closing;

    const socket = this.socket;
    if (socket) {
      this.failPending(socket, new Error("PLC client closed"));
      socket.close();
    } else if (this.connectPromise) {
      void this.connectPromise.catch(() => undefined);
    } else {
      this.completeClose();
    }

    return closing;
  }

  async ping(): Promise<void> {
    const response = await this.request("PING");
    if (response !== "PONG") {
      throw new Error(`Expected PONG, received ${response}`);
    }
  }

  async reset(): Promise<void> {
    const response = await this.request("RESET");
    if (response !== "RESET_OK") {
      throw new Error(`Expected RESET_OK, received ${response}`);
    }
  }

  async evaluate(source: string): Promise<PlcEvaluationResult> {
    const encodedSource = Buffer.from(source, "utf8").toString("base64");
    const response = await this.request(`EVALUATE\t${encodedSource}`);
    const fields = response.split("\t");

    if (fields[0] === "OK" && fields.length === 3) {
      return {
        ok: true,
        output: this.decodeText(fields[1]),
        value: this.decodeText(fields[2]),
      };
    }

    if (fields[0] === "ERR" && fields.length === 4) {
      return {
        ok: false,
        errorKind: fields[1],
        message: this.decodeText(fields[2]),
        output: this.decodeText(fields[3]),
      };
    }

    throw new Error("PLC returned a malformed evaluation response");
  }

  getStatus(): PlcClientStatus {
    return this.status;
  }

  private request(line: string): Promise<string> {
    if (this.status !== "connected" || !this.socket) {
      return Promise.reject(
        new Error(`PLC client is not connected (${this.status})`),
      );
    }

    if (line.includes("\n") || line.includes("\r")) {
      return Promise.reject(new Error("PLC request must fit on one line"));
    }

    const socket = this.socket;
    if (socket.data.pending || socket.data.outgoing) {
      return Promise.reject(new Error("A PLC request is already in progress"));
    }

    return new Promise<string>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          if (socket.data.pending !== pending) {
            return;
          }
          const error = new Error("PLC request timed out");
          this.failPending(socket, error);
          if (this.socket === socket) {
            this.status = "error";
            socket.close();
          }
        }, PLC_REQUEST_TIMEOUT_MS),
      };

      socket.data.pending = pending;
      socket.data.outgoing = Buffer.from(`${line}\n`, "utf8");
      socket.data.outgoingOffset = 0;
      this.flushOutgoing(socket);
    });
  }

  private flushOutgoing(socket: Bun.Socket<PlcSocketState>): void {
    const outgoing = socket.data.outgoing;
    if (!outgoing) {
      return;
    }

    const written = socket.write(
      outgoing,
      socket.data.outgoingOffset,
      outgoing.byteLength - socket.data.outgoingOffset,
    );
    if (written < 0) {
      this.handleSocketError(socket, new Error("PLC socket is closed"));
      return;
    }

    socket.data.outgoingOffset += written;
    if (socket.data.outgoingOffset === outgoing.byteLength) {
      socket.data.outgoing = null;
      socket.data.outgoingOffset = 0;
    }
  }

  private receiveData(
    socket: Bun.Socket<PlcSocketState>,
    bytes: Buffer,
  ): void {
    socket.data.buffer += socket.data.decoder.decode(bytes, {stream: true});

    while (true) {
      const newline = socket.data.buffer.indexOf("\n");
      if (newline === -1) {
        return;
      }

      const line = socket.data.buffer.slice(0, newline).replace(/\r$/, "");
      socket.data.buffer = socket.data.buffer.slice(newline + 1);
      this.receiveLine(socket, line);
    }
  }

  private receiveLine(
    socket: Bun.Socket<PlcSocketState>,
    line: string,
  ): void {
    const pending = socket.data.pending;
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    socket.data.pending = null;
    pending.resolve(line);
  }

  private handleSocketError(
    socket: Bun.Socket<PlcSocketState>,
    error: Error,
  ): void {
    this.failPending(socket, error);
    if (this.status !== "closing") {
      this.status = "error";
    }
    socket.close();
  }

  private handleSocketClose(socket: Bun.Socket<PlcSocketState>): void {
    this.failPending(socket, new Error("PLC connection closed"));
    socket.data.buffer = "";
    socket.data.outgoing = null;
    socket.data.outgoingOffset = 0;

    if (this.socket === socket) {
      this.socket = null;
    }

    if (this.status === "closing") {
      this.completeClose();
    } else {
      this.status = "error";
    }
  }

  private failPending(
    socket: Bun.Socket<PlcSocketState>,
    error: Error,
  ): void {
    const pending = socket.data.pending;
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    socket.data.pending = null;
    socket.data.outgoing = null;
    socket.data.outgoingOffset = 0;
    pending.reject(error);
  }

  private completeClose(): void {
    const finishClose = this.finishClose;
    this.finishClose = null;
    this.closePromise = null;
    this.socket = null;
    this.status = "disconnected";
    finishClose?.();
  }

  private decodeText(encoded: string): string {
    const decoded = Buffer.from(encoded, "base64");
    if (decoded.toString("base64") !== encoded) {
      throw new Error("PLC returned invalid Base64 text");
    }
    return decoded.toString("utf8");
  }
}
