import {useEffect, useLayoutEffect, useRef, useState} from "react";
import type {
  RedisTerminalExecution,
  RedisTerminalSnapshot,
} from "@break-my-system/server";
import {
  KeyRound,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {cn} from "../../lib/cn";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";

type RedisTerminalProps = {
  terminal: RedisTerminalSnapshot;
  terminals: RedisTerminalSnapshot[];
  history: RedisTerminalExecution[];
  isFocused: boolean;
  isInspectorOpen: boolean;
  isSending: boolean;
  socketStatus: string;
  onClose: (terminalId: string) => void;
  onCreate: () => void;
  onFocusChange: (focused: boolean) => void;
  onInspectorChange: (open: boolean) => void;
  onSelect: (terminalId: string) => void;
  onSendCommand: (command: string) => void;
};

export function RedisTerminal({
  terminal,
  terminals,
  history,
  isFocused,
  isInspectorOpen,
  isSending,
  socketStatus,
  onClose,
  onCreate,
  onFocusChange,
  onInspectorChange,
  onSelect,
  onSendCommand,
}: RedisTerminalProps) {
  const [visibleFrom, setVisibleFrom] = useState(0);
  const [command, setCommand] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const trimmedCommand = command.trim();

  useEffect(() => {
    setVisibleFrom(0);
  }, [terminal.id]);

  useLayoutEffect(() => {
    const output = outputRef.current;
    if (!output) return;
    output.scrollTop = output.scrollHeight;
  }, [history]);

  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending, terminal.id]);

  return (
    <section
      className={cn(
        "terminal-surface flex min-h-0 flex-col overflow-hidden font-mono text-sm text-foreground",
        isFocused && "fixed inset-0 z-50 border-0",
      )}
    >
      <div className="flex min-h-10 items-stretch border-b border-border bg-surface">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {terminals.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "group relative flex shrink-0 items-center border-r border-border",
                item.id === terminal.id
                  ? "bg-background after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                  : "bg-surface",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={item.id === terminal.id}
                className={cn(
                  "h-full px-3 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.id === terminal.id && "text-foreground",
                )}
                onClick={() => onSelect(item.id)}
              >
                terminal {index + 1}
              </button>
              <button
                type="button"
                aria-label={`Close redis ${index + 1}`}
                className="mr-1 p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onClose(item.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label="New Redis terminal"
            className="flex w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onCreate}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex shrink-0 items-center border-l border-border px-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "hidden border-0 font-mono text-muted-foreground sm:flex",
              isInspectorOpen && "text-primary",
            )}
            aria-pressed={isInspectorOpen}
            onClick={() => onInspectorChange(!isInspectorOpen)}
          >
            <KeyRound className="size-3.5" />
            Inspector
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden border-0 font-mono text-muted-foreground sm:flex"
            onClick={() => setVisibleFrom(history.length)}
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFocused ? "Exit terminal focus" : "Focus terminal"}
            className="border-0 text-muted-foreground"
            onClick={() => onFocusChange(!isFocused)}
          >
            {isFocused ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={outputRef}
        className="min-h-0 flex-1 overflow-auto px-4 py-3"
        aria-label="Terminal history"
      >
        <div className="mb-5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              terminal.status === "connected" ? "bg-success" : "bg-warning",
            )}
          />
          redis {terminal.status} · socket {socketStatus.toLowerCase()}
        </div>
        {history.slice(visibleFrom).length === 0 ? (
          <div className="mb-4 text-xs text-muted-foreground">
            Run PING or begin typing a Redis command.
          </div>
        ) : (
          history.slice(visibleFrom).map((entry) => (
            <div key={entry.id} className="mb-4">
              <div className="text-foreground">
                <span className="mr-2 text-primary">❯</span>
                {entry.input.command.join(" ")}
              </div>
              {entry.errorMessage ? (
                <div className="mt-1 whitespace-pre-wrap pl-5 text-danger">
                  {entry.errorMessage}
                </div>
              ) : (
                <pre className="mt-1 whitespace-pre-wrap pl-5 text-foreground/75">
                  {entry.outputLines.join("\n")}
                </pre>
              )}
            </div>
          ))
        )}
        <form
          className="flex min-h-7 items-center gap-2"
          aria-busy={isSending}
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedCommand || isSending) return;
            onSendCommand(trimmedCommand);
            setCommand("");
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <span className="text-primary">❯</span>
          <Input
            ref={inputRef}
            value={command}
            autoFocus
            autoComplete="off"
            aria-label="Type a Redis command"
            className="h-auto min-w-0 flex-1 border-none bg-transparent px-0 py-0 font-mono text-foreground shadow-none focus-visible:ring-0"
            onChange={(event) => setCommand(event.target.value)}
          />
          {isSending ? (
            <span className="text-[9px] text-muted-foreground">running…</span>
          ) : null}
        </form>
      </div>
    </section>
  );
}
