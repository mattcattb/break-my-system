import type {RedisTerminalSnapshot} from "@break-my-system/server";
import {Database, Plus, Plug, PlugZap, RotateCcw} from "lucide-react";
import {Button} from "../../components/ui/button";
import {cn} from "../../lib/cn";

export function RedisStatusBar({
  terminal,
  keyCount,
  supportedCommandCount,
  isConnectionPending,
  onConnect,
  onCreateTerminal,
  onDisconnect,
  onReconnect,
}: {
  terminal: RedisTerminalSnapshot;
  keyCount?: number | null;
  supportedCommandCount?: number | null;
  isConnectionPending: boolean;
  onConnect: () => void;
  onCreateTerminal: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}) {
  const isConnected = terminal.status === "connected";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center border border-red-900 bg-red-950/50 text-red-300">
          <Database className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm text-foreground">Go Redis</h1>
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected ? "bg-green-400" : "bg-amber-400",
              )}
            />
            <span className="font-mono text-xs text-muted-foreground">
              {terminal.status}
            </span>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {keyCount ?? "—"} keys · {supportedCommandCount ?? "—"} supported
            commands · {terminal.commandCount} run
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
