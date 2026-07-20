import {createFileRoute, Link} from "@tanstack/react-router";
import {ArrowRight, Bomb, Braces, Database, FileArchive} from "lucide-react";
import {AppHeader} from "../components/common/SystemShell";

export const Route = createFileRoute("/")({component: HomePage});

const systems = [
  {
    name: "Go Redis",
    code: "REDIS/GO",
    to: "/redis" as const,
    icon: Database,
    detail: "RESP · TCP",
  },
  {
    name: "PLC Runtime",
    code: "PLC/JVM",
    to: "/plc" as const,
    icon: Braces,
    detail: "PARSER · EVALUATOR",
  },
  {
    name: "WAD Filesystem",
    code: "WAD/C++",
    to: "/wad" as const,
    icon: FileArchive,
    detail: "BINARY · FILESYSTEM",
  },
  {
    name: "Minesweeper",
    code: "MINE/C++",
    to: "/minesweeper" as const,
    icon: Bomb,
    detail: "WEBSOCKET · REALTIME",
  },
];

function HomePage() {
  return (
    <div className="workshop-page">
      <AppHeader />
      <main className="page-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              System directory
            </p>
            <h1 className="mt-1 text-lg font-medium">Select a system</h1>
          </div>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="status-dot status-dot-active" /> 4 available
          </span>
        </div>

        <div className="border border-border bg-surface">
          {systems.map((system, index) => {
            const Icon = system.icon;
            return (
              <Link
                key={system.to}
                to={system.to}
                className="group grid min-h-20 grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 last:border-b-0 hover:bg-muted sm:grid-cols-[2rem_2.5rem_minmax(0,1fr)_12rem_auto]"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex size-9 items-center justify-center border border-border bg-background text-muted-foreground group-hover:text-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{system.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {system.code}
                  </span>
                </span>
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                  {system.detail}
                </span>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
