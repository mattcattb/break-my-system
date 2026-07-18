import * as Dialog from "@radix-ui/react-dialog";
import {useQuery} from "@tanstack/react-query";
import {Trophy, X} from "lucide-react";
import {parseResponse} from "hono/client";
import {Button} from "../../components/ui/button";
import {ResourceState} from "../../components/common/ResourceState";
import {rpcClient} from "../../lib/rpc.client";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export function LeaderboardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const leaderboard = useQuery({
    queryKey: ["minesweeper-leaderboard"],
    queryFn: () =>
      parseResponse(rpcClient.api.minesweeper.leaderboard.$get()),
    enabled: open,
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 border border-border bg-surface-elevated p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-5 w-5 text-warning" />
                Fastest clears
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Best completed games reported by the Minesweeper runtime.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close leaderboard">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-5 border border-border">
            {leaderboard.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading leaderboard…
              </div>
            ) : leaderboard.isError ? (
              <ResourceState
                className="border-0"
                title="Leaderboard unavailable"
                description="The scores could not be loaded from the server."
                actionLabel="Try again"
                onAction={() => void leaderboard.refetch()}
                tone="danger"
              />
            ) : leaderboard.data?.entries.length ? (
              <ol>
                {leaderboard.data.entries.map((entry, index) => (
                  <li
                    key={`${entry.name}-${entry.seconds}-${index}`}
                    className="grid grid-cols-[3rem_1fr_auto] items-center border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="font-mono text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{entry.name}</span>
                    <span className="font-mono text-primary">
                      {formatTime(entry.seconds)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ResourceState
                className="border-0"
                title="No completed games yet"
                description="Scores will appear when the runtime leaderboard is connected."
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
