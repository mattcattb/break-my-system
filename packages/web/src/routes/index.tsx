import {createFileRoute, Link} from "@tanstack/react-router";
import {
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  AppHeader,
  DirectorySectionHeader,
  SystemMark,
  systemCatalog,
} from "../components/common/SystemShell";

export const Route = createFileRoute("/")({component: HomePage});

const systems = [
  {
    system: "redis",
    code: "REDIS/GO",
    to: "/redis" as const,
    detail: "RESP · TCP",
    github: "https://github.com/mattcattb/go-redis",
    docker: "https://hub.docker.com/r/mattbou12/break-my-redis",
  },
  {
    system: "plc",
    code: "PLC/JVM",
    to: "/plc" as const,
    detail: "PARSER · EVALUATOR",
    github: "https://github.com/mattcattb/PLCProject",
    docker: "https://hub.docker.com/r/mattbou12/plc-runtime",
  },
  {
    system: "wad",
    code: "WAD/C++",
    to: "/wad" as const,
    detail: "BINARY · FILESYSTEM",
    github: "https://github.com/mattcattb/Wad-Fuse-Filesystem",
    docker: "https://hub.docker.com/r/mattbou12/wad-server",
  },
  {
    system: "minesweeper",
    code: "MINE/C++",
    to: "/minesweeper" as const,
    detail: "WEBSOCKET · REALTIME",
    github: "https://github.com/mattcattb/Minesweeper",
    docker: "https://hub.docker.com/r/mattbou12/minesweeper",
  },
  {
    system: "torrent",
    code: "TORRENT/GO",
    to: "/torrent" as const,
    detail: "P2P · PIECES",
    github: "https://github.com/mattcattb/go-torrent",
    docker: "https://hub.docker.com/r/mattbou12/go-torrent",
  },
] as const;

function HomePage() {
  return (
    <div className="system-interface workshop-page">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            System directory
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Choose a system
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Open a system directory, then continue an existing workspace or
            start a new one.
          </p>
        </div>

        <section className="border border-border bg-surface">
          <DirectorySectionHeader title="Systems" detail="5 available" />
          {systems.map((system, index) => {
            const {label} = systemCatalog[system.system];
            return (
              <div
                key={system.to}
                className="grid min-h-16 grid-cols-[1.5rem_2.25rem_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 last:border-b-0 hover:bg-muted sm:grid-cols-[1.5rem_2.25rem_minmax(9rem,auto)_auto_minmax(0,1fr)_auto]"
              >
                <span className="font-mono text-[9px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <SystemMark system={system.system} />
                <Link
                  to={system.to}
                  className="min-w-0"
                >
                  <span className="block truncate text-xs font-semibold">
                    {label}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                    {system.code}
                  </span>
                </Link>
                <div className="flex items-center gap-1">
                  <a
                    href={system.github}
                    target="_blank"
                    rel="noreferrer"
                    className="group grid size-7 place-items-center border border-transparent hover:border-border hover:bg-surface-elevated"
                    aria-label={`${label} on GitHub`}
                    title={`${label} on GitHub`}
                  >
                    <img
                      src="/icons/github.svg"
                      alt=""
                      className="size-3.5 opacity-50 group-hover:opacity-100"
                    />
                  </a>
                  <a
                    href={system.docker}
                    target="_blank"
                    rel="noreferrer"
                    className="group grid size-7 place-items-center border border-transparent hover:border-border hover:bg-surface-elevated"
                    aria-label={`${label} on Docker Hub`}
                    title={`${label} on Docker Hub`}
                  >
                    <img
                      src="/icons/docker.svg"
                      alt=""
                      className="size-4 opacity-55 group-hover:opacity-100"
                    />
                  </a>
                </div>
                <span className="hidden justify-self-end font-mono text-[9px] text-muted-foreground sm:block">
                  {system.detail}
                </span>
                <Link
                  to={system.to}
                  className="group grid size-7 place-items-center"
                  aria-label={`Open ${label}`}
                >
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
              </div>
            );
          })}
        </section>

        <section className="mt-5 border border-border bg-surface">
          <DirectorySectionHeader title="New workspace" />
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {systems.map((system) => (
              <Link
                key={system.to}
                to={system.to}
                className="flex min-h-11 items-center gap-2 bg-surface px-3 text-xs text-foreground/75 hover:bg-muted hover:text-foreground sm:last:col-span-2"
              >
                <Plus className="size-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  {systemCatalog[system.system].label}
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
