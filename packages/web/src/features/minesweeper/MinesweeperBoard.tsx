import type {MinesweeperServerMessage} from "@break-my-system/server";
import {Bomb, Flag} from "lucide-react";
import {cn} from "../../lib/cn";

type GameSnapshot = Extract<
  MinesweeperServerMessage,
  {type: "game.snapshot"}
>["payload"];
type Tile = GameSnapshot["tiles"][number];
type HiddenTile = Extract<Tile, {state: "hidden"}>;
type RevealedTile = Extract<Tile, {state: "revealed"}>;

type TileAction = (row: number, col: number) => void;

type MinesweeperBoardProps = {
  snapshot: GameSnapshot;
  disabled: boolean;
  onReveal: TileAction;
  onToggleFlag: TileAction;
};

const numberColor = (value: number) =>
  [
    "",
    "text-[#73daca]",
    "text-[#e0af68]",
    "text-[#f7768e]",
    "text-[#bb9af7]",
    "text-orange-400",
    "text-cyan-400",
    "text-foreground",
    "text-muted-foreground",
  ][value] ?? "text-foreground";

function HiddenMinesweeperTile({
  tile,
  disabled,
  onReveal,
  onToggleFlag,
}: {
  tile: HiddenTile;
  disabled: boolean;
  onReveal: TileAction;
  onToggleFlag: TileAction;
}) {
  const label = `Hidden tile at row ${tile.row + 1}, column ${tile.col + 1}${tile.flagged ? ", flagged" : ""}`;

  return (
    <button
      type="button"
      className="grid size-[var(--mine-cell-size)] select-none place-items-center border border-border bg-surface-elevated text-[#e0af68] transition-colors hover:border-[#73daca] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73daca]/60 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      aria-label={label}
      onClick={() => onReveal(tile.row, tile.col)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!disabled) onToggleFlag(tile.row, tile.col);
      }}
    >
      {tile.flagged ? (
        <Flag className="size-[45%] fill-current" aria-hidden="true" />
      ) : null}
    </button>
  );
}

function RevealedMinesweeperTile({tile}: {tile: RevealedTile}) {
  if (tile.value === "mine") {
    return (
      <div
        className="grid size-[var(--mine-cell-size)] place-items-center border border-danger/30 bg-danger/10 text-danger"
        aria-label={`Mine at row ${tile.row + 1}, column ${tile.col + 1}`}
      >
        <Bomb className="size-[45%]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid size-[var(--mine-cell-size)] place-items-center border border-border bg-background font-mono text-[11px] font-semibold",
        numberColor(tile.value),
      )}
      aria-label={`${tile.value} adjacent mines at row ${tile.row + 1}, column ${tile.col + 1}`}
    >
      {tile.value > 0 ? tile.value : null}
    </div>
  );
}

function MinesweeperTile({
  tile,
  disabled,
  onReveal,
  onToggleFlag,
}: {
  tile: Tile;
  disabled: boolean;
  onReveal: TileAction;
  onToggleFlag: TileAction;
}) {
  if (tile.state === "hidden") {
    return (
      <HiddenMinesweeperTile
        tile={tile}
        disabled={disabled}
        onReveal={onReveal}
        onToggleFlag={onToggleFlag}
      />
    );
  }

  return <RevealedMinesweeperTile tile={tile} />;
}

export function MinesweeperBoard({
  snapshot,
  disabled,
  onReveal,
  onToggleFlag,
}: MinesweeperBoardProps) {
  return (
    <div className="max-w-full overflow-x-auto border border-border bg-surface p-3 sm:p-6">
      <div className="mx-auto w-max border border-border bg-background p-2.5 [--mine-cell-size:1.9rem] sm:p-3 sm:[--mine-cell-size:2.2rem]">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${snapshot.cols}, var(--mine-cell-size))`,
          }}
          role="grid"
          aria-label={`${snapshot.rows} by ${snapshot.cols} Minesweeper board`}
        >
          {snapshot.tiles.map((tile) => (
            <MinesweeperTile
              key={`${tile.row}-${tile.col}`}
              tile={tile}
              disabled={disabled}
              onReveal={onReveal}
              onToggleFlag={onToggleFlag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
