import {existsSync} from "node:fs";
import {join, resolve} from "node:path";
import {appEnv} from "../common/env";
import {ServiceException} from "../common/errors";

const PLC_EVALUATION_TIMEOUT_MS = 5_000;

const findProjectPath = () => {
  const candidates = [
    appEnv.PLC_PROJECT_PATH,
    resolve(process.cwd(), "../PLCProject"),
    resolve(process.cwd(), "../../../PLCProject"),
    resolve(process.cwd(), "PLCProject"),
  ].filter((path): path is string => Boolean(path));

  return candidates.find((path) => existsSync(join(path, "gradlew"))) ?? null;
};

const findJavaHome = () => {
  const candidates = [
    appEnv.PLC_JAVA_HOME,
    process.env.JAVA_HOME,
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@24/libexec/openjdk.jdk/Contents/Home",
  ].filter((path): path is string => Boolean(path));

  return candidates.find((path) => existsSync(join(path, "bin/java"))) ?? null;
};

const plcProcessEnv = () => {
  const javaHome = findJavaHome();
  return javaHome ? {...process.env, JAVA_HOME: javaHome} : process.env;
};

let buildPromise: Promise<string> | null = null;

const prepareExecutable = () => {
  if (buildPromise) return buildPromise;

  buildPromise = (async () => {
    const projectPath = findProjectPath();
    if (!projectPath) {
      throw new ServiceException({
        message: "PLC project not found",
        details: "Set PLC_PROJECT_PATH to the PLCProject directory",
      });
    }

    const build = Bun.spawn(["./gradlew", "-q", "installDist"], {
      cwd: projectPath,
      env: plcProcessEnv(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30_000,
    });
    const [exitCode, stderr] = await Promise.all([
      build.exited,
      new Response(build.stderr).text(),
    ]);

    if (exitCode !== 0) {
      throw new ServiceException({
        message: "Unable to build the PLC runtime",
        details: stderr.trim(),
      });
    }

    return join(projectPath, "build/install/PlcProject/bin/PlcProject");
  })().catch((error) => {
    buildPromise = null;
    throw error;
  });

  return buildPromise;
};

const createPlcConnection = (sandboxId: string) => {
  let process: Bun.Subprocess<"pipe", "pipe", "pipe"> | null = null;
  let readResponseLine: (() => Promise<string>) | null = null;
  let bufferedOutput = "";
  let status: "idle" | "connecting" | "connected" | "error" = "idle";
  let requests = Promise.resolve();

  const readLine = async () => {
    if (!readResponseLine) throw new Error("PLC process is not running");
    return readResponseLine();
  };

  const connect = async () => {
    if (process && process.exitCode === null) return;

    status = "connecting";
    const executable = await prepareExecutable();
    process = Bun.spawn([executable, "--server", "--mode=evaluator"], {
      env: plcProcessEnv(),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    const reader = process.stdout.getReader();
    const decoder = new TextDecoder();
    readResponseLine = async () => {
      while (true) {
        const newline = bufferedOutput.indexOf("\n");
        if (newline !== -1) {
          const line = bufferedOutput.slice(0, newline).replace(/\r$/, "");
          bufferedOutput = bufferedOutput.slice(newline + 1);
          return line;
        }

        const chunk = await reader.read();
        if (chunk.done) {
          throw new Error("PLC process stopped without a response");
        }
        bufferedOutput += decoder.decode(chunk.value, {stream: true});
      }
    };
    bufferedOutput = "";
    status = "connected";
  };

  const evaluateOnce = async (source: string) => {
    try {
      await connect();
      if (!process) throw new Error("PLC process is not running");

      const encoded = Buffer.from(source, "utf8").toString("base64");
      process.stdin.write(`${encoded}\n`);
      await process.stdin.flush();

      let timeout: ReturnType<typeof setTimeout> | undefined;
      const line = await Promise.race([
        readLine(),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error("PLC evaluation timed out")),
            PLC_EVALUATION_TIMEOUT_MS,
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      const separator = line.indexOf("\t");
      if (separator === -1) throw new Error("PLC returned a malformed response");

      const result = line.slice(0, separator);
      const output = Buffer.from(line.slice(separator + 1), "base64").toString(
        "utf8",
      );
      if (result !== "OK" && result !== "ERR") {
        throw new Error("PLC returned an unknown response status");
      }

      return {ok: result === "OK", output};
    } catch (error) {
      await close();
      status = "error";
      if (error instanceof ServiceException) throw error;
      throw new ServiceException({
        message: "PLC evaluation failed",
        details: error instanceof Error ? error.message : error,
      });
    }
  };

  const evaluate = (source: string) => {
    const request = requests.then(
      () => evaluateOnce(source),
      () => evaluateOnce(source),
    );
    requests = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  };

  const close = async () => {
    const activeProcess = process;
    process = null;
    readResponseLine = null;
    bufferedOutput = "";
    status = "idle";

    if (activeProcess && activeProcess.exitCode === null) {
      activeProcess.kill();
      await activeProcess.exited;
    }
  };

  return {
    sandboxId,
    evaluate,
    reset: close,
    close,
    getStatus: () => status,
  };
};

type PlcConnection = ReturnType<typeof createPlcConnection>;
const connections = new Map<string, PlcConnection>();

export const PlcRegistry = {
  getOrCreate(sandboxId: string) {
    const existing = connections.get(sandboxId);
    if (existing) return existing;

    const connection = createPlcConnection(sandboxId);
    connections.set(sandboxId, connection);
    return connection;
  },

  getStatus(sandboxId: string) {
    return connections.get(sandboxId)?.getStatus() ?? "idle";
  },

  async reset(sandboxId: string) {
    const connection = this.getOrCreate(sandboxId);
    await connection.reset();
  },

  async closeForSandbox(sandboxId: string) {
    const connection = connections.get(sandboxId);
    if (!connection) return;
    connections.delete(sandboxId);
    await connection.close();
  },
};
