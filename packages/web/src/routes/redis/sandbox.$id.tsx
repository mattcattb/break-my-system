import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {DetailedError, parseResponse} from "hono/client";
import {useEffect, useRef, useState} from "react";
import {RedisKeyExplorer} from "../../features/redis/RedisKeyExplorer";
import {RedisStatusBar} from "../../features/redis/RedisStatusBar";
import {RedisTerminal} from "../../features/redis/RedisTerminal";
import {useSandboxWebSocket} from "../../hooks/useWebsocket";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

const sandboxKeys = {
  snapshot: (sandboxId: string) => ["redis-sandbox", sandboxId] as const,
  history: (sandboxId: string, terminalId: string) =>
    ["redis-sandbox", sandboxId, "terminal", terminalId, "history"] as const,
  redisStatus: (sandboxId: string, terminalId: string) =>
    ["redis-sandbox", sandboxId, "terminal", terminalId, "status"] as const,
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof DetailedError) {
    const data = error.detail?.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
    ) {
      return data.error.message;
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Request failed";
};

const sandboxQueryOptions = (sandboxId: string) =>
  queryOptions({
    queryKey: sandboxKeys.snapshot(sandboxId),
    queryFn: async () => {
      try {
        return await parseResponse(
          rpcClient.api.redis.sandbox[":sandboxId"].$get({
            param: {sandboxId},
          }),
        );
      } catch (error) {
        if (error instanceof DetailedError && error.statusCode === 404) {
          throw redirect({to: "/redis"});
        }

        throw error;
      }
    },
  });

export const Route = createFileRoute("/redis/sandbox/$id")({
  beforeLoad: ({params}) => ({sandboxId: params.id}),
  loader: ({context}) =>
    context.queryClient.ensureQueryData(
      sandboxQueryOptions(context.sandboxId),
    ),
  component: RedisSandboxPage,
});

function RedisSandboxPage() {
  const {sandboxId} = Route.useRouteContext();
  const queryClient = useQueryClient();
  const {data: sandbox} = useSuspenseQuery(sandboxQueryOptions(sandboxId));
  const terminals = sandbox.tools.filter(
    (tool) => tool.kind === "command-terminal",
  );
  const explorers = sandbox.tools.filter(
    (tool) => tool.kind === "redis-key-explorer",
  );
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>();
  const [isTerminalFocused, setIsTerminalFocused] = useState(false);
  const [attachedToolIds, setAttachedToolIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingCommandCount, setPendingCommandCount] = useState(0);
  const attachingToolIds = useRef(new Set<string>());
  const pendingCommands = useRef(new Map<string, string>());
  const requestedTerminal = useRef(false);
  const requestedExplorer = useRef(false);
  const requestedInitialScan = useRef<string>();
  const terminal =
    terminals.find((tool) => tool.id === selectedTerminalId) ?? terminals[0];
  const explorer = explorers[0];
  const {
    isConnected: isSocketConnected,
    lastJsonMessage,
    sendMessage: sendSocketMessage,
    status: socketStatus,
  } = useSandboxWebSocket(sandboxId);

  const createTerminal = useMutation({
    mutationFn: async () =>
      parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"].terminal.$post({
          param: {sandboxId},
        }),
      ),
    onError: (error) => {
      requestedTerminal.current = false;
      appToast.error(`error creating terminal: ${getErrorMessage(error)}`);
    },
    onSuccess: (createdTerminal) => {
      setSelectedTerminalId(createdTerminal.id);
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
    },
  });

  const createExplorer = useMutation({
    mutationFn: async () =>
      parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"]["key-explorer"].$post({
          param: {sandboxId},
        }),
      ),
    onError: (error) => {
      requestedExplorer.current = false;
      appToast.error(`error creating key explorer: ${getErrorMessage(error)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
    },
  });

  const closeTerminal = useMutation({
    mutationFn: async (terminalId: string) =>
      parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].$delete({param: {sandboxId, terminalId}}),
      ),
    onError: (error) => {
      appToast.error(`error closing terminal: ${getErrorMessage(error)}`);
    },
    onSuccess: (_result, closedTerminalId) => {
      if (closedTerminalId === terminal?.id) {
        setSelectedTerminalId(
          terminals.find((tool) => tool.id !== closedTerminalId)?.id,
        );
      }
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
    },
  });

  const changeConnection = useMutation({
    mutationFn: async ({
      action,
      terminalId,
    }: {
      action: "connect" | "disconnect" | "reconnect";
      terminalId: string;
    }) => {
      const terminalClient =
        rpcClient.api.redis.sandbox[":sandboxId"].terminal[":terminalId"];
      const args = {param: {sandboxId, terminalId}};

      if (action === "connect") {
        return parseResponse(terminalClient.connect.$post(args));
      }
      if (action === "disconnect") {
        return parseResponse(terminalClient.disconnect.$post(args));
      }
      return parseResponse(terminalClient.reconnect.$post(args));
    },
    onError: (error) => {
      appToast.error(`connection error: ${getErrorMessage(error)}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.redisStatus(sandboxId, variables.terminalId),
      });
    },
  });

  const historyQuery = useQuery({
    queryKey: sandboxKeys.history(sandboxId, terminal?.id ?? "pending"),
    enabled: Boolean(terminal),
    queryFn: async () => {
      if (!terminal) return [];
      return parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].history.$get({
          param: {sandboxId, terminalId: terminal.id},
        }),
      );
    },
  });

  const redisStatusQuery = useQuery({
    queryKey: sandboxKeys.redisStatus(sandboxId, terminal?.id ?? "pending"),
    enabled: Boolean(terminal),
    queryFn: async () => {
      if (!terminal) return null;
      return parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].redis.status.$get({
          param: {sandboxId, terminalId: terminal.id},
        }),
      );
    },
  });

  const scanKeys = useMutation({
    mutationFn: async ({
      cursor,
      pattern,
    }: {
      cursor: string;
      pattern: string;
    }) => {
      if (!explorer) throw new Error("Key explorer is not ready");
      return parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"]["key-explorer"][
          ":explorerId"
        ].scan.$post({
          param: {sandboxId, explorerId: explorer.id},
          json: {count: 100, cursor, pattern},
        }),
      );
    },
    onError: (error) => {
      appToast.error(`scan error: ${getErrorMessage(error)}`);
    },
  });

  const inspectKey = useMutation({
    mutationFn: async (key: string) => {
      if (!explorer) throw new Error("Key explorer is not ready");
      return parseResponse(
        rpcClient.api.redis.sandbox[":sandboxId"]["key-explorer"][
          ":explorerId"
        ].inspect.$post({
          param: {sandboxId, explorerId: explorer.id},
          json: {key},
        }),
      );
    },
    onError: (error) => {
      appToast.error(`inspection error: ${getErrorMessage(error)}`);
    },
  });

  useEffect(() => {
    if (terminal) {
      requestedTerminal.current = false;
      return;
    }
    if (!requestedTerminal.current && !createTerminal.isPending) {
      requestedTerminal.current = true;
      createTerminal.mutate();
    }
  }, [createTerminal, terminal]);

  useEffect(() => {
    if (explorer) {
      requestedExplorer.current = false;
      return;
    }
    if (!requestedExplorer.current && !createExplorer.isPending) {
      requestedExplorer.current = true;
      createExplorer.mutate();
    }
  }, [createExplorer, explorer]);

  useEffect(() => {
    if (!selectedTerminalId && terminal) setSelectedTerminalId(terminal.id);
  }, [selectedTerminalId, terminal]);

  useEffect(() => {
    if (!isTerminalFocused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsTerminalFocused(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTerminalFocused]);

  useEffect(() => {
    if (!isSocketConnected) {
      setAttachedToolIds(new Set());
      attachingToolIds.current.clear();
      pendingCommands.current.clear();
      setPendingCommandCount(0);
    }
  }, [isSocketConnected]);

  useEffect(() => {
    if (
      !isSocketConnected ||
      !terminal ||
      attachedToolIds.has(terminal.id) ||
      attachingToolIds.current.has(terminal.id)
    ) {
      return;
    }

    attachingToolIds.current.add(terminal.id);
    sendSocketMessage({
      type: "tool.attach",
      toolId: terminal.id,
      requestId: crypto.randomUUID(),
      payload: {},
    });
  }, [attachedToolIds, isSocketConnected, sendSocketMessage, terminal]);

  useEffect(() => {
    const message = lastJsonMessage;
    if (!message) return;

    if (message.type === "tool.attached") {
      attachingToolIds.current.delete(message.toolId);
      setAttachedToolIds((current) => new Set(current).add(message.toolId));
      return;
    }

    if (message.type === "terminal.command.result") {
      pendingCommands.current.delete(message.requestId);
      setPendingCommandCount(pendingCommands.current.size);
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.history(sandboxId, message.toolId),
      });
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.redisStatus(sandboxId, message.toolId),
      });
      return;
    }

    if (message.type === "error") {
      if (message.toolId) attachingToolIds.current.delete(message.toolId);
      if (message.requestId) {
        pendingCommands.current.delete(message.requestId);
        setPendingCommandCount(pendingCommands.current.size);
      }
      appToast.error(message.payload.message);
    }
  }, [lastJsonMessage, queryClient, sandboxId]);

  useEffect(() => {
    if (!explorer || requestedInitialScan.current === explorer.id) return;
    requestedInitialScan.current = explorer.id;
    scanKeys.mutate({cursor: "0", pattern: explorer.pattern});
  }, [explorer, scanKeys]);

  const sendTerminalCommand = (command: string) => {
    if (!terminal || !isSocketConnected) {
      appToast.error("Terminal socket is not connected");
      return;
    }
    if (!attachedToolIds.has(terminal.id)) {
      appToast.error("Terminal is still attaching");
      return;
    }

    const requestId = crypto.randomUUID();
    pendingCommands.current.set(requestId, terminal.id);
    setPendingCommandCount(pendingCommands.current.size);
    sendSocketMessage({
      type: "terminal.command",
      toolId: terminal.id,
      requestId,
      payload: {input: command},
    });
  };

  if (!terminal) {
    return (
      <pre className="min-h-screen bg-black p-4 font-mono text-green-700">
        {createTerminal.isPending ? "starting redis terminal" : "terminal pending"}
      </pre>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <RedisStatusBar
        terminal={terminal}
        keyCount={redisStatusQuery.data?.keyCount}
        supportedCommandCount={redisStatusQuery.data?.supportedCommandCount}
        isConnectionPending={changeConnection.isPending}
        onConnect={() =>
          changeConnection.mutate({action: "connect", terminalId: terminal.id})
        }
        onCreateTerminal={() => createTerminal.mutate()}
        onDisconnect={() =>
          changeConnection.mutate({
            action: "disconnect",
            terminalId: terminal.id,
          })
        }
        onReconnect={() =>
          changeConnection.mutate({
            action: "reconnect",
            terminalId: terminal.id,
          })
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <RedisTerminal
          terminal={terminal}
          terminals={terminals}
          history={historyQuery.data ?? []}
          isFocused={isTerminalFocused}
          isSending={pendingCommandCount > 0}
          socketStatus={socketStatus}
          onClose={(terminalId) => closeTerminal.mutate(terminalId)}
          onCreate={() => createTerminal.mutate()}
          onFocusChange={setIsTerminalFocused}
          onSelect={setSelectedTerminalId}
          onSendCommand={sendTerminalCommand}
        />
        {!isTerminalFocused && explorer ? (
          <RedisKeyExplorer
            explorer={explorer}
            inspection={inspectKey.data}
            isInspecting={inspectKey.isPending}
            isScanning={scanKeys.isPending}
            scan={scanKeys.data}
            onInspect={(key) => inspectKey.mutate(key)}
            onScan={(pattern, cursor) => scanKeys.mutate({cursor, pattern})}
          />
        ) : null}
      </div>
    </div>
  );
}
