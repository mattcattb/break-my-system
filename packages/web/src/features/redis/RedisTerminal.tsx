import {useEffect, useRef, useState} from "react";
import type {Terminal, TerminalHistoryEntry} from "@break-my-system/server";
import {Maximize2, Minimize2, Plus, Trash2, X} from "lucide-react";
import {cn} from "../../lib/cn";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";

type RedisTerminalProps = {
  terminal: Terminal;
  terminals: Terminal[];
  history: TerminalHistoryEntry[];
  isFocused: boolean;
  isSending: boolean;
  onClose: (terminalId: string) => void;
  onCreate: () => void;
  onFocusChange: (focused: boolean) => void;
  onSelect: (terminalId: string) => void;
  onSendCommand: (command: string) => void;
};

export function RedisTerminal({
  terminal,
  terminals,
  history,
  isFocused,
  isSending,
  onClose,
  onCreate,
  onFocusChange,
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

  useEffect(() => {
    outputRef.current?.scrollTo({top: outputRef.current.scrollHeight});
  }, [history]);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border border-green-900 bg-black font-mono text-sm text-green-300",
        isFocused && "fixed inset-0 z-50 border-0",
      )}
    >
      <div className="flex min-h-10 items-stretch border-b border-green-950 bg-green-950/30">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {terminals.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "group flex shrink-0 items-center border-r border-green-950",
                item.id === terminal.id ? "bg-black" : "bg-green-950/20",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={item.id === terminal.id}
                className="h-full px-3 text-left text-xs text-green-500 hover:text-green-300"
                onClick={() => onSelect(item.id)}
              >
                redis {index + 1}
                <span className="ml-2 text-green-800">{item.status}</span>
              </button>
              <button
                type="button"
                aria-label={`Close redis ${index + 1}`}
                className="mr-1 p-1 text-green-800 hover:bg-green-950 hover:text-green-300"
                onClick={() => onClose(item.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label="New Redis terminal"
            className="flex w-10 shrink-0 items-center justify-center text-green-700 hover:bg-green-950 hover:text-green-300"
            onClick={onCreate}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex shrink-0 items-center border-l border-green-950 px-1">
          <Button
            variant="ghost"
            size="sm"
            className="border-0 font-mono text-green-700 hover:bg-green-950 hover:text-green-300"
            onClick={() => setVisibleFrom(history.length)}
          >
            <Trash2 className="size-3.5" />
            clear
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFocused ? "Exit terminal focus" : "Focus terminal"}
            className="border-0 text-green-700 hover:bg-green-950 hover:text-green-300"
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

      <div ref={outputRef} className="min-h-0 flex-1 overflow-auto px-4 py-3">
        <div className="mb-3 text-xs text-green-800">
          connection {terminal.connectionId} · {terminal.status}
        </div>
        {history.slice(visibleFrom).length === 0 ? (
          <div className="text-green-800">
            Run PING, COMMANDLIST, or SET name matty to begin.
          </div>
        ) : (
          history.slice(visibleFrom).map((entry) => (
            <div key={entry.id} className="mb-4">
              <div className="text-green-400">
                <span className="mr-2 text-green-700">$</span>
                {entry.input.command.join(" ")}
              </div>
              {entry.errorMessage ? (
                <div className="mt-1 whitespace-pre-wrap text-red-400">
                  {entry.errorMessage}
                </div>
              ) : (
                <pre className="mt-1 whitespace-pre-wrap text-green-200">
                  {entry.outputLines.join("\n")}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-green-950 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!trimmedCommand || isSending) return;
          onSendCommand(trimmedCommand);
          setCommand("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <span className="text-green-500">&gt;</span>
        <Input
          ref={inputRef}
          value={command}
          autoFocus
          disabled={isSending}
          placeholder="Type a Redis command"
          className="h-auto border-none bg-black px-0 py-0 font-mono text-green-300 shadow-none placeholder:text-green-800 focus-visible:ring-0"
          onChange={(event) => setCommand(event.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="border-green-950 font-mono text-green-500 hover:bg-green-950"
          disabled={!trimmedCommand || isSending}
        >
          {isSending ? "running…" : "enter"}
        </Button>
      </form>
    </section>
  );
}
