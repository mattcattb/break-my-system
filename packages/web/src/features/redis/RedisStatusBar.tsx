import type {RedisTerminalSnapshot} from "@break-my-system/server";
import {Database, Plus, Plug, PlugZap, RotateCcw} from "lucide-react";
import {Button} from "../../components/ui/button";
import {WorkspaceHeader} from "../../components/common/SystemShell";

export function RedisStatusBar({
  terminal,
  workspaceId,
  keyCount,
  supportedCommandCount,
  isConnectionPending,
  onConnect,
  onCreateTerminal,
  onDisconnect,
  onReconnect,
}: {
  terminal: RedisTerminalSnapshot;
  workspaceId: string;
  keyCount?: number | null;
  supportedCommandCount?: number | null;
  isConnectionPending: boolean;
  onConnect: () => void;
  onCreateTerminal: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}) {
  const isConnected = terminal.status === "connected";

  const actions = (
    <>
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isConnectionPending}
            onClick={onDisconnect}
          >
            <PlugZap className="size-3.5" />
            disconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={isConnectionPending}
            onClick={onConnect}
          >
            <Plug className="size-3.5" />
            connect
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isConnectionPending}
          onClick={onReconnect}
        >
          <RotateCcw className="size-3.5" />
          reconnect
        </Button>
        <Button variant="secondary" size="sm" onClick={onCreateTerminal}>
          <Plus className="size-3.5" />
          terminal
        </Button>
    </>
  );

  return (
    <WorkspaceHeader
      system="Go Redis"
      workspaceId={workspaceId}
      status={terminal.status}
      backTo="/redis"
      icon={<Database className="size-4 text-red-400" />}
      meta={`${keyCount ?? "—"} keys · ${supportedCommandCount ?? "—"} commands · ${terminal.commandCount} run`}
      actions={actions}
    />
  );
}
