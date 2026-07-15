import {createFileRoute, redirect} from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {DetailedError, parseResponse} from "hono/client";
import type {Terminal} from "@break-my-system/server";
import {TerminalPanel} from "../../components/Terminal";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";
import {useEffect, useRef} from "react";

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
  const terminal = sandbox.tools[0];
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
    onSuccess: () => {
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

  return (
    <div className="min-h-screen bg-black font-mono text-sm text-green-300">
      {terminal ? (
        <SandboxTerminal
          terminal={terminal}
          sandboxId={sandboxId}
          isSending={sendCommand.isPending}
          onSendCommand={(command) =>
            sendCommand.mutate({terminalId: terminal.id, command})
          }
        />
      ) : (
        <pre className="p-4 text-green-700">
          {createTerminal.isPending ? "starting terminal" : "terminal pending"}
        </pre>
      )}
    </div>
  );
}

function SandboxTerminal({
  terminal,
  sandboxId,
  isSending,
  onSendCommand,
}: {
  terminal: Terminal;
  sandboxId: string;
  isSending: boolean;
  onSendCommand: (command: string) => void;
}) {
  const historyQuery = useQuery({
    queryKey: sandboxKeys.history(sandboxId, terminal.id),
    queryFn: async () => {
      return await parseResponse(
        rpcClient.api.sandbox[":sandboxId"].terminal[
          ":terminalId"
        ].history.$get({
          param: {sandboxId, terminalId: terminal.id},
        }),
      );
    },
  });
  const outputLines =
    historyQuery.data?.flatMap((entry) => [
      `$ ${entry.input.command.join(" ")}`,
      ...(entry.errorMessage
        ? [`error: ${entry.errorMessage}`]
        : entry.outputLines),
    ]) ?? [];

  return (
    <TerminalPanel
      terminal={terminal}
      sandboxId={sandboxId}
      outputLines={outputLines}
      isSending={isSending}
      onSendCommand={onSendCommand}
    />
  );
}
