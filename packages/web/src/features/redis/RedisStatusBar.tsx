import type {RedisTerminalSnapshot} from "@break-my-system/server";
import {
  ChevronDown,
  Database,
  KeyRound,
  Plug,
  PlugZap,
  RotateCcw,
  X,
} from "lucide-react";
import {useState} from "react";
import {Button} from "../../components/ui/button";
import {WorkspaceHeader} from "../../components/common/SystemShell";

export function RedisStatusBar({
  terminal,
  workspaceId,
  keyCount,
  supportedCommandCount,
  isConnectionPending,
  isInspectorOpen,
  socketStatus,
  onConnect,
  onDisconnect,
  onInspectorChange,
  onReconnect,
}: {
  terminal: RedisTerminalSnapshot;
  workspaceId: string;
  keyCount?: number | null;
  supportedCommandCount?: number | null;
  isConnectionPending: boolean;
  isInspectorOpen: boolean;
  socketStatus: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onInspectorChange: (open: boolean) => void;
  onReconnect: () => void;
}) {
  const isConnected = terminal.status === "connected";
  const [connectionOpen, setConnectionOpen] = useState(false);

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={isInspectorOpen}
        className={isInspectorOpen ? "border-primary/50 bg-primary/10 text-primary" : ""}
        onClick={() => onInspectorChange(!isInspectorOpen)}
      >
        <KeyRound className="size-3.5" />
        {keyCount ?? "—"} keys
      </Button>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="min-w-32 justify-between"
          aria-expanded={connectionOpen}
          onClick={() => setConnectionOpen((open) => !open)}
        >
            <span className="flex items-center gap-2">
              <span
                className={`size-1.5 rounded-full ${
                  isConnected ? "bg-success" : "bg-warning"
                }`}
              />
              Connection
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
        {connectionOpen ? (
          <aside className="redis-workspace absolute right-0 top-full z-50 mt-2 w-80 border border-border bg-popover shadow-2xl">
          <div className="border-b border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Redis connection
                </p>
                <div className="mt-2 font-mono text-sm text-foreground">
                  Server environment
                </div>
              </div>
              <button
                type="button"
                className="grid size-7 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close connection details"
                onClick={() => setConnectionOpen(false)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <span
              className={`mt-2 block font-mono text-[10px] ${
                isConnected ? "text-success" : "text-warning"
              }`}
            >
              {terminal.status}
            </span>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-y-3 border-b border-border p-4 font-mono text-[10px]">
            <dt className="text-muted-foreground">Configuration</dt>
            <dd>REDIS_URL</dd>
            <dt className="text-muted-foreground">Socket</dt>
            <dd>{socketStatus.toLowerCase()}</dd>
            <dt className="text-muted-foreground">Keys</dt>
            <dd>{keyCount ?? "—"}</dd>
            <dt className="text-muted-foreground">Supported commands</dt>
            <dd>{supportedCommandCount ?? "—"}</dd>
            <dt className="text-muted-foreground">Commands run</dt>
            <dd>{terminal.commandCount}</dd>
          </dl>
          <div className="flex items-center justify-end gap-2 p-3">
            {isConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isConnectionPending}
                  onClick={onDisconnect}
                >
                  <PlugZap className="size-3.5" />
                  Disconnect
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isConnectionPending}
                  onClick={onReconnect}
                >
                  <RotateCcw className="size-3.5" />
                  Reconnect
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={isConnectionPending}
                onClick={onConnect}
              >
                <Plug className="size-3.5" />
                Connect
              </Button>
            )}
          </div>
          </aside>
        ) : null}
      </div>
    </>
  );

  return (
    <WorkspaceHeader
      system="Go Redis"
      workspaceId={workspaceId}
      status={terminal.status}
      backTo="/redis"
      icon={<Database className="size-4 text-red-400" />}
      meta={`${terminal.commandCount} commands run`}
      actions={actions}
    />
  );
}
