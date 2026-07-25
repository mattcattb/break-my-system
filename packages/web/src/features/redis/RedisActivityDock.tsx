import type {RedisTerminalExecution} from "@break-my-system/server";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  X,
} from "lucide-react";
import {useState} from "react";

export function RedisActivityDock({
  history,
  socketStatus,
  terminalStatus,
}: {
  history: RedisTerminalExecution[];
  socketStatus: string;
  terminalStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const latest = history[history.length - 1];
  const failures = history.filter((entry) => entry.status === "error").length;
  const recent = history.slice(-6).reverse();

  return (
    <section className="border-t border-border bg-surface font-mono">
      <button
        type="button"
        className="flex h-9 w-full items-center gap-3 px-3 text-left text-[10px] text-muted-foreground hover:bg-muted"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Activity className="size-3.5" />
        <span className="font-semibold text-foreground">Activity</span>
        <span className="hidden min-w-0 items-center gap-2 sm:flex">
          {latest ? (
            <>
              {latest.status === "error" ? (
                <X className="size-3 shrink-0 text-danger" />
              ) : latest.status === "success" ? (
                <Check className="size-3 shrink-0 text-success" />
              ) : (
                <Clock3 className="size-3 shrink-0 text-warning" />
              )}
              <span className="truncate">
                {latest.input.command.join(" ")}
              </span>
            </>
          ) : (
            <>
              <span
                className={`size-1.5 rounded-full ${
                  terminalStatus === "connected" ? "bg-success" : "bg-warning"
                }`}
              />
              socket {socketStatus.toLowerCase()}
            </>
          )}
        </span>
        {failures > 0 ? (
          <span className="ml-auto flex items-center gap-2 text-danger">
            <AlertTriangle className="size-3" />
            {failures} failed
          </span>
        ) : (
          <span className="ml-auto text-muted-foreground">
            {history.length} commands
          </span>
        )}
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronUp className="size-3.5" />
        )}
      </button>

      {open ? (
        <div className="max-h-48 overflow-auto border-t border-border">
          {recent.length ? (
            <div className={`grid ${recent.length > 1 ? "md:grid-cols-2" : ""}`}>
              {recent.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] items-start border-b border-border px-3 py-2.5 md:odd:border-r"
                >
                  <span className="pt-0.5 text-[9px] text-muted-foreground">
                    {new Date(
                      entry.completedAt ?? entry.startedAt,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="grid size-5 place-items-center">
                    {entry.status === "error" ? (
                      <X className="size-3.5 text-danger" />
                    ) : entry.status === "success" ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Clock3 className="size-3.5 text-warning" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] text-foreground">
                      {entry.input.command.join(" ")}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">
                      {entry.errorMessage ??
                        entry.outputLines[0] ??
                        entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-[10px] text-muted-foreground">
              Commands and connection events will appear here.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
