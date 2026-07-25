import {Link} from "@tanstack/react-router";
import {ArrowLeft, Bomb} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "../../lib/cn";

export function MinesweeperHeader({
  workspaceId,
  status,
  actions,
}: {
  workspaceId?: string;
  status: string;
  actions?: ReactNode;
}) {
  const normalizedStatus = status.toLowerCase();
  const statusTone = ["ready", "connected", "playing", "won"].includes(
    normalizedStatus,
  )
    ? "bg-[#63e6be]"
    : ["connecting", "idle", "closing"].includes(normalizedStatus)
      ? "bg-[#ffc857]"
      : "bg-[#ff7085]";

  return (
    <header className="border-b border-[#26394a] bg-[#0d151f]">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {workspaceId ? (
            <Link
              to="/minesweeper"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#26394a] text-[#8296a6] hover:bg-[#172534] hover:text-[#edf7f5]"
              aria-label="Back to Minesweeper"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : null}
          <Link
            to="/"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#163c39] text-[#63e6be]"
            aria-label="Break My System home"
          >
            <Bomb className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.17em] text-[#8296a6]">
              Break / My System
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-sm font-semibold text-[#edf7f5]">
                Minesweeper
              </h1>
              {workspaceId ? (
                <span className="truncate font-mono text-[9px] text-[#8296a6]">
                  / {workspaceId}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-[#26394a] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8296a6]">
            <span className={cn("size-1.5 rounded-full", statusTone)} />
            {status}
          </span>
          {actions}
        </div>
      </div>
    </header>
  );
}
