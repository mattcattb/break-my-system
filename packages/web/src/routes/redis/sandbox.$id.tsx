import {createFileRoute, redirect} from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {DetailedError, parseResponse} from "hono/client";
import {RedisKeyInspector} from "../../features/redis/RedisKeyInspector";
import {RedisStatusBar} from "../../features/redis/RedisStatusBar";
import {RedisTerminal} from "../../features/redis/RedisTerminal";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";
import {useEffect, useRef, useState} from "react";

const sandboxKeys = {
  snapshot: (sandboxId: string) => ["sandbox", sandboxId] as const,
  history: (sandboxId: string, terminalId: string) =>
    ["sandbox", sandboxId, "terminal", terminalId, "history"] as const,
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof DetailedError) {
    const data = err.detail?.data;

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

    return err.message;
  }

  return err instanceof Error ? err.message : "Request failed";
};

export const Route = createFileRoute("/redis/sandbox/$id")({
  beforeLoad: ({params}) => {
    return {
      sandboxId: params.id,
    };
  },
  loader: ({context}) => {
    return context.queryClient.ensureQueryData(
      sandboxQueryOptions(context.sandboxId),
    );
  },
  component: RouteComponent,
});

const sandboxQueryOptions = (sandboxId: string) =>
  queryOptions({
    queryKey: sandboxKeys.snapshot(sandboxId),
    queryFn: async () => {
      try {
        return await parseResponse(
          rpcClient.api.sandbox[":sandboxId"].$get({param: {sandboxId}}),
        );
      } catch (err) {
        if (err instanceof DetailedError && err.statusCode === 404) {
          throw redirect({to: "/redis"});
        }

        throw err;
      }
    },
  });

function RouteComponent() {
  const {sandboxId} = Route.useRouteContext();
  const queryClient = useQueryClient();
  const {data: sandbox} = useSuspenseQuery(sandboxQueryOptions(sandboxId));
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>();
  const [isTerminalFocused, setIsTerminalFocused] = useState(false);
  const terminal =
    sandbox.tools.find((tool) => tool.id === selectedTerminalId) ??
    sandbox.tools[0];
  const requestedTerminal = useRef(false);

  const createTerminal = useMutation({
    mutationFn: async () => {
      return await parseResponse(
        rpcClient.api.sandbox[":sandboxId"].terminal.$post({
          param: {sandboxId},
        }),
      );
    },
    onError: (err) => {
      appToast.error(`error creating terminal: ${getErrorMessage(err)}`);
    },
    onSuccess: (createdTerminal) => {
      setSelectedTerminalId(createdTerminal.id);
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
    },
  });

  const closeTerminal = useMutation({
    mutationFn: async (terminalId: string) => {
      return await parseResponse(
        rpcClient.api.sandbox[":sandboxId"].terminal[":terminalId"].$delete({
          param: {sandboxId, terminalId},
        }),
      );
    },
    onError: (err) => {
      appToast.error(`error closing terminal: ${getErrorMessage(err)}`);
    },
    onSuccess: (_result, closedTerminalId) => {
      if (closedTerminalId === terminal?.id) {
        setSelectedTerminalId(
          sandbox.tools.find((tool) => tool.id !== closedTerminalId)?.id,
        );
      }
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
    },
  });

  const sendCommand = useMutation({
    mutationFn: async ({
      command,
      terminalId,
    }: {
      command: string;
      terminalId: string;
    }) => {
      return await parseResponse(
        rpcClient.api.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].command.$post({
          param: {sandboxId, terminalId},
          json: {command},
        }),
      );
    },
    onError: (err, vars) => {
      appToast.error(`error on ${vars.terminalId}: ${getErrorMessage(err)}`);
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.history(sandboxId, vars.terminalId),
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.snapshot(sandboxId),
      });
      queryClient.invalidateQueries({
        queryKey: sandboxKeys.history(sandboxId, vars.terminalId),
      });
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
    if (!selectedTerminalId && terminal) {
      setSelectedTerminalId(terminal.id);
    }
  }, [selectedTerminalId, terminal]);

  useEffect(() => {
    if (!isTerminalFocused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsTerminalFocused(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTerminalFocused]);

  const historyQuery = useQuery({
    queryKey: sandboxKeys.history(sandboxId, terminal?.id ?? "pending"),
    enabled: !!terminal,
    queryFn: async () => {
      if (!terminal) return [];
      return await parseResponse(
        rpcClient.api.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].history.$get({
          param: {sandboxId, terminalId: terminal.id},
        }),
      );
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {terminal ? (
        <>
          <RedisStatusBar
            terminal={terminal}
            onCreateTerminal={() => createTerminal.mutate()}
          />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <RedisTerminal
              terminal={terminal}
              terminals={sandbox.tools}
              history={historyQuery.data ?? []}
              isFocused={isTerminalFocused}
              isSending={sendCommand.isPending}
              onClose={(terminalId) => closeTerminal.mutate(terminalId)}
              onCreate={() => createTerminal.mutate()}
              onFocusChange={setIsTerminalFocused}
              onSelect={setSelectedTerminalId}
              onSendCommand={(command) =>
                sendCommand.mutate({terminalId: terminal.id, command})
              }
            />
            {!isTerminalFocused ? <RedisKeyInspector /> : null}
          </div>
        </>
      ) : (
        <pre className="min-h-screen bg-black p-4 font-mono text-green-700">
          {createTerminal.isPending ? "starting terminal" : "terminal pending"}
        </pre>
      )}
    </div>
  );
}
