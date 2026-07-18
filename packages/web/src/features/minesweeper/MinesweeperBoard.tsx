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
    "text-blue-400",
    "text-emerald-400",
    "text-red-400",
    "text-violet-400",
    "text-orange-400",
    "text-cyan-400",
    "text-white",
    "text-zinc-400",
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
      className="flex h-8 w-8 items-center justify-center border-2 border-b-zinc-800 border-l-zinc-200 border-r-zinc-800 border-t-zinc-200 bg-zinc-400 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled}
      aria-label={label}
      onClick={() => onReveal(tile.row, tile.col)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!disabled) onToggleFlag(tile.row, tile.col);
      }}
    >
      {tile.flagged ? <Flag className="h-4 w-4" /> : null}
    </button>
  );
}

function RevealedMinesweeperTile({tile}: {tile: RevealedTile}) {
  if (tile.value === "mine") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center bg-zinc-300 text-zinc-900"
        aria-label={`Mine at row ${tile.row + 1}, column ${tile.col + 1}`}
      >
        <Bomb className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center bg-zinc-300 font-mono text-sm font-bold",
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
    <div className="max-w-full overflow-auto border-4 border-zinc-500 bg-zinc-500 shadow-2xl">
      <div
        className="grid gap-px bg-zinc-700"
        style={{gridTemplateColumns: `repeat(${snapshot.cols}, 2rem)`}}
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
  );
}
