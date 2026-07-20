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
import {useRedisWebSocket} from "../../hooks/useWebsocket";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

const workspaceKeys = {
  snapshot: (workspaceId: string) => ["redis-workspace", workspaceId] as const,
  history: (workspaceId: string, terminalId: string) =>
    ["redis-workspace", workspaceId, "terminal", terminalId, "history"] as const,
  connection: (workspaceId: string) =>
    ["redis-workspace", workspaceId, "connection"] as const,
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

const workspaceQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: workspaceKeys.snapshot(workspaceId),
    queryFn: async () => {
      try {
        return await parseResponse(
          rpcClient.api.redis.workspaces[":workspaceId"].$get({
            param: {workspaceId},
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

export const Route = createFileRoute("/redis/$workspaceId")({
  beforeLoad: ({params}) => ({workspaceId: params.workspaceId}),
  loader: ({context}) =>
    context.queryClient.ensureQueryData(
      workspaceQueryOptions(context.workspaceId),
    ),
  component: RedisWorkspacePage,
});

function RedisWorkspacePage() {
  const {workspaceId} = Route.useRouteContext();
  const queryClient = useQueryClient();
  const {data: workspace} = useSuspenseQuery(workspaceQueryOptions(workspaceId));
  const terminals = workspace.terminals;
  const explorers = workspace.keyExplorers;
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>();
  const [isTerminalFocused, setIsTerminalFocused] = useState(false);
  const [attachedTerminalIds, setAttachedTerminalIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingCommandCount, setPendingCommandCount] = useState(0);
  const attachingTerminalIds = useRef(new Set<string>());
  const pendingCommands = useRef(new Map<string, string>());
  const requestedTerminal = useRef(false);
  const requestedExplorer = useRef(false);
  const requestedInitialScan = useRef<string>();
  const terminal =
    terminals.find((candidate) => candidate.id === selectedTerminalId) ??
    terminals[0];
  const explorer = explorers[0];
  const {
    isConnected: isSocketConnected,
    lastJsonMessage,
    sendMessage: sendSocketMessage,
    status: socketStatus,
  } = useRedisWebSocket(workspaceId);

  const invalidateWorkspace = () =>
    queryClient.invalidateQueries({queryKey: workspaceKeys.snapshot(workspaceId)});

  const createTerminal = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"].terminals.$post({
          param: {workspaceId},
        }),
      ),
    onError: (error) => {
      requestedTerminal.current = false;
      appToast.error(`error creating terminal: ${getErrorMessage(error)}`);
    },
    onSuccess: (createdTerminal) => {
      setSelectedTerminalId(createdTerminal.id);
      invalidateWorkspace();
    },
  });

  const createExplorer = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"]["key-explorers"].$post({
          param: {workspaceId},
        }),
      ),
    onError: (error) => {
      requestedExplorer.current = false;
      appToast.error(`error creating key explorer: ${getErrorMessage(error)}`);
    },
    onSuccess: invalidateWorkspace,
  });

  const closeTerminal = useMutation({
    mutationFn: (terminalId: string) =>
      parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"].terminals[
          ":terminalId"
        ].$delete({param: {workspaceId, terminalId}}),
      ),
    onError: (error) => {
      appToast.error(`error closing terminal: ${getErrorMessage(error)}`);
    },
    onSuccess: (_result, closedTerminalId) => {
      attachingTerminalIds.current.delete(closedTerminalId);
      setAttachedTerminalIds((current) => {
        const next = new Set(current);
        next.delete(closedTerminalId);
        return next;
      });
      if (closedTerminalId === terminal?.id) {
        setSelectedTerminalId(
          terminals.find((candidate) => candidate.id !== closedTerminalId)?.id,
        );
      }
      invalidateWorkspace();
    },
  });

  const changeConnection = useMutation({
    mutationFn: async (action: "connect" | "disconnect" | "reconnect") => {
      const connection = rpcClient.api.redis.workspaces[":workspaceId"].connection;
      const args = {param: {workspaceId}};

      if (action === "connect") return parseResponse(connection.connect.$post(args));
      if (action === "disconnect") {
        return parseResponse(connection.disconnect.$post(args));
      }

      await parseResponse(connection.disconnect.$post(args));
      return parseResponse(connection.connect.$post(args));
    },
    onError: (error) => {
      appToast.error(`connection error: ${getErrorMessage(error)}`);
    },
    onSuccess: () => {
      invalidateWorkspace();
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.connection(workspaceId),
      });
    },
  });

  const historyQuery = useQuery({
    queryKey: workspaceKeys.history(workspaceId, terminal?.id ?? "pending"),
    enabled: Boolean(terminal),
    queryFn: () => {
      if (!terminal) return [];
      return parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"].terminals[
          ":terminalId"
        ].history.$get({param: {workspaceId, terminalId: terminal.id}}),
      );
    },
  });

  const redisStatusQuery = useQuery({
    queryKey: workspaceKeys.connection(workspaceId),
    queryFn: () =>
      parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"].connection.status.$get({
          param: {workspaceId},
        }),
      ),
  });

  const scanKeys = useMutation({
    mutationFn: ({cursor, pattern}: {cursor: string; pattern: string}) => {
      if (!explorer) throw new Error("Key explorer is not ready");
      return parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"]["key-explorers"][
          ":explorerId"
        ].scan.$post({
          param: {workspaceId, explorerId: explorer.id},
          json: {count: 100, cursor, pattern},
        }),
      );
    },
    onError: (error) => appToast.error(`scan error: ${getErrorMessage(error)}`),
  });

  const inspectKey = useMutation({
    mutationFn: (key: string) => {
      if (!explorer) throw new Error("Key explorer is not ready");
      return parseResponse(
        rpcClient.api.redis.workspaces[":workspaceId"]["key-explorers"][
          ":explorerId"
        ].inspect.$post({
          param: {workspaceId, explorerId: explorer.id},
          json: {key},
        }),
      );
    },
    onError: (error) =>
      appToast.error(`inspection error: ${getErrorMessage(error)}`),
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
    if (isSocketConnected) return;
    setAttachedTerminalIds(new Set());
    attachingTerminalIds.current.clear();
    pendingCommands.current.clear();
    setPendingCommandCount(0);
  }, [isSocketConnected]);

  useEffect(() => {
    if (
      !isSocketConnected ||
      !terminal ||
      attachedTerminalIds.has(terminal.id) ||
      attachingTerminalIds.current.has(terminal.id)
    ) {
      return;
    }

    attachingTerminalIds.current.add(terminal.id);
    sendSocketMessage({
      type: "terminal.attach",
      terminalId: terminal.id,
      requestId: crypto.randomUUID(),
    });
  }, [attachedTerminalIds, isSocketConnected, sendSocketMessage, terminal]);

  useEffect(() => {
    const message = lastJsonMessage;
    if (!message) return;

    if (message.type === "terminal.attached") {
      attachingTerminalIds.current.delete(message.terminalId);
      setAttachedTerminalIds((current) => new Set(current).add(message.terminalId));
      return;
    }

    if (message.type === "terminal.command.result") {
      pendingCommands.current.delete(message.requestId);
      setPendingCommandCount(pendingCommands.current.size);
      invalidateWorkspace();
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.history(workspaceId, message.terminalId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.connection(workspaceId),
      });
      return;
    }

    if (message.type === "error") {
      if (message.terminalId) attachingTerminalIds.current.delete(message.terminalId);
      if (message.requestId) {
        pendingCommands.current.delete(message.requestId);
        setPendingCommandCount(pendingCommands.current.size);
      }
      appToast.error(message.payload.message);
    }
  }, [lastJsonMessage, queryClient, workspaceId]);

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
    if (!attachedTerminalIds.has(terminal.id)) {
      appToast.error("Terminal is still attaching");
      return;
    }

    const requestId = crypto.randomUUID();
    pendingCommands.current.set(requestId, terminal.id);
    setPendingCommandCount(pendingCommands.current.size);
    sendSocketMessage({
      type: "terminal.command",
      terminalId: terminal.id,
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
        workspaceId={workspaceId}
        keyCount={redisStatusQuery.data?.keyCount}
        supportedCommandCount={redisStatusQuery.data?.supportedCommandCount}
        isConnectionPending={changeConnection.isPending}
        onConnect={() => changeConnection.mutate("connect")}
        onCreateTerminal={() => createTerminal.mutate()}
        onDisconnect={() => changeConnection.mutate("disconnect")}
        onReconnect={() => changeConnection.mutate("reconnect")}
      />
      <div className="tool-grid">
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
