import type {RedisKeyExplorerSnapshot} from "@break-my-system/server";
import type {InferResponseType} from "hono/client";
import {KeyRound, RefreshCw, Search, X} from "lucide-react";
import {useEffect, useState} from "react";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {cn} from "../../lib/cn";
import {rpcClient} from "../../lib/rpc.client";

type KeyExplorer = RedisKeyExplorerSnapshot;
type KeyScan = InferResponseType<
  (typeof rpcClient.api.redis.workspaces)[":workspaceId"]["key-explorers"][":explorerId"]["scan"]["$post"],
  200
>;
type KeyInspection = InferResponseType<
  (typeof rpcClient.api.redis.workspaces)[":workspaceId"]["key-explorers"][":explorerId"]["inspect"]["$post"],
  200
>;

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

export function RedisKeyExplorer({
  explorer,
  inspection,
  isInspecting,
  isScanning,
  onInspect,
  onScan,
  onClose,
  scan,
}: {
  explorer: KeyExplorer;
  inspection?: KeyInspection;
  isInspecting: boolean;
  isScanning: boolean;
  onInspect: (key: string) => void;
  onScan: (pattern: string, cursor: string) => void;
  onClose: () => void;
  scan?: KeyScan;
}) {
  const [pattern, setPattern] = useState(explorer.pattern);
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    setPattern(explorer.pattern);
    setSelectedKey("");
  }, [explorer.id, explorer.pattern]);

  const inspect = (key: string) => {
    setSelectedKey(key);
    onInspect(key);
  };

  return (
    <aside className="flex min-h-0 flex-col border-t border-border bg-surface lg:border-l lg:border-t-0">
      <div className="flex min-h-10 items-center border-b border-border px-3">
        <span className="font-mono text-[10px] font-semibold text-foreground">
          Inspector
        </span>
        <span className="ml-3 font-mono text-[9px] text-muted-foreground">
          Keys {scan?.keys.length ?? 0}
        </span>
        <button
          type="button"
          className="ml-auto grid size-7 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close key inspector"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isScanning) onScan(pattern.trim() || "*", "0");
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 border border-border bg-background px-2.5 focus-within:border-primary/70">
              <Search className="size-3 shrink-0 text-muted-foreground" />
              <Input
                value={pattern}
                placeholder="Search keys"
                aria-label="Search keys"
                className="h-8 min-w-0 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
                onChange={(event) => setPattern(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              size="icon"
              disabled={isScanning}
              aria-label="Scan keys"
            >
              <RefreshCw className={cn("size-3.5", isScanning && "animate-spin")} />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(8rem,0.8fr)_minmax(12rem,1.2fr)] lg:grid-rows-[minmax(8rem,0.7fr)_minmax(12rem,1.3fr)]">
        <div className="min-h-0 overflow-auto border-b border-border">
          {scan?.keys.length ? (
            <div>
              {scan.keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border border-l-2 border-l-transparent px-3 py-2.5 text-left font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground",
                    selectedKey === key &&
                      "border-l-primary bg-primary/10 text-foreground",
                  )}
                  aria-pressed={selectedKey === key}
                  onClick={() => inspect(key)}
                >
                  <KeyRound
                    className={cn(
                      "size-3 shrink-0 text-muted-foreground",
                      selectedKey === key && "text-primary",
                    )}
                  />
                  <span className="truncate">{key}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
              {isScanning ? "Scanning…" : "No keys loaded. Scan * to begin."}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-auto">
          {inspection ? (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-xs text-foreground">
                  {inspection.key}
                </code>
                <span className="bg-muted px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground">
                  {inspection.exists ? inspection.type : "missing"}
                </span>
              </div>
              <dl className="grid grid-cols-[4rem_1fr] gap-y-2 font-mono text-[10px]">
                <dt className="text-muted-foreground">Exists</dt>
                <dd>{inspection.exists ? "yes" : "no"}</dd>
                <dt className="text-muted-foreground">TTL</dt>
                <dd>
                  {inspection.ttlSeconds === -1
                    ? "persistent"
                    : inspection.ttlSeconds === -2
                      ? "missing"
                      : `${inspection.ttlSeconds} seconds`}
                </dd>
                {inspection.size !== null ? (
                  <>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{inspection.size}</dd>
                  </>
                ) : null}
              </dl>
              {inspection.exists && inspection.value !== null ? (
                <pre className="mt-4 overflow-auto whitespace-pre-wrap break-all border border-border bg-background p-3 font-mono text-[10px] leading-5 text-foreground/80">
                  {formatValue(inspection.value)}
                </pre>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
              <KeyRound className="mb-3 size-7 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                Select a key to inspect it.
              </p>
              {isInspecting ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Inspecting…
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {scan && scan.cursor !== "0" ? (
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full font-mono"
            disabled={isScanning}
            onClick={() => onScan(pattern.trim() || "*", scan.cursor)}
          >
            next scan page
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
