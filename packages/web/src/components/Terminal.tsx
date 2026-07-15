import {useRef, useState} from "react";
import type {Terminal} from "@break-my-system/server";
import {cn} from "../lib/cn";
import {Button} from "./ui/button";
import {Input} from "./ui/input";

type TerminalPanelProps = {
  terminal: Terminal;
  sandboxId?: string;
  outputLines?: string[];
  isSending?: boolean;
  onSendCommand?: (command: string) => void;
  className?: string;
};

export function TerminalPanel({
  terminal,
  sandboxId = terminal.id,
  outputLines = [],
  isSending = false,
  onSendCommand,
  className,
}: TerminalPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-screen flex-col bg-black font-mono text-sm text-green-300",
        className,
      )}
    >
      <TerminalOutput sandboxId={sandboxId} lines={outputLines} />
      <TerminalCommandForm
        isSending={isSending}
        onSubmit={onSendCommand}
      />
    </section>
  );
}

type TerminalOutputProps = {
  sandboxId: string;
  lines?: string[];
};

function TerminalOutput({sandboxId, lines = []}: TerminalOutputProps) {
  return (
    <pre className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 leading-5">
      <span className="text-green-700">sandbox {sandboxId}</span>
      {lines.length > 0 ? `\n${lines.join("\n")}` : ""}
    </pre>
  );
}

type TerminalCommandFormProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSubmit?: (command: string) => void;
};

function TerminalCommandForm({
  disabled = false,
  isSending = false,
  onSubmit,
}: TerminalCommandFormProps) {
  const [command, setCommand] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedCommand = command.trim();
  const canSubmit =
    !!onSubmit && !disabled && !isSending && trimmedCommand.length > 0;

  return (
    <form
      className="flex items-center gap-2 border-t border-green-950 bg-black px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();

        if (!canSubmit) {
          return;
        }

        onSubmit(trimmedCommand);
        setCommand("");
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
    >
      <span className="text-green-500">&gt;</span>
      <Input
        ref={inputRef}
        value={command}
        disabled={disabled}
        placeholder="PING"
        className="h-auto border-none bg-black px-0 py-0 font-mono text-green-300 shadow-none placeholder:text-green-800 focus-visible:ring-0"
        onChange={(event) => setCommand(event.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="border-green-950 bg-black px-2 font-mono text-green-500 hover:bg-green-950"
        disabled={!canSubmit || isSending}
      >
        {isSending ? "..." : "enter"}
      </Button>
    </form>
  );
}
