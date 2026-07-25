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
    "text-[#63e6be]",
    "text-[#ffc857]",
    "text-[#ff7085]",
    "text-[#a99cff]",
    "text-[#ff9f68]",
    "text-[#6edff6]",
    "text-[#edf7f5]",
    "text-[#8296a6]",
  ][value] ?? "text-[#edf7f5]";

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
      className="grid size-[var(--mine-cell-size)] select-none place-items-center rounded-[7px] border border-[#26394a] bg-[#203142] text-[#ffc857] shadow-[0_3px_0_#091018] transition-all hover:-translate-y-px hover:border-[#63e6be] hover:bg-[#273b4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63e6be]/60 disabled:cursor-not-allowed disabled:opacity-60"
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
        className="grid size-[var(--mine-cell-size)] place-items-center rounded-[6px] bg-[#321923] text-[#ff7085]"
        aria-label={`Mine at row ${tile.row + 1}, column ${tile.col + 1}`}
      >
        <Bomb className="size-[45%]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid size-[var(--mine-cell-size)] place-items-center rounded-[6px] bg-[#0c1721] font-mono text-[11px] font-bold",
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
    <div className="max-w-full overflow-x-auto rounded-[1.75rem] border border-[#26394a] bg-[#111c28] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
      <div className="mx-auto w-max rounded-2xl bg-[#091018] p-2.5 [--mine-cell-size:1.9rem] sm:p-3 sm:[--mine-cell-size:2.2rem]">
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
