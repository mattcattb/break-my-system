import type {RedisKeyExplorerSnapshot} from "@break-my-system/server";
import type {InferResponseType} from "hono/client";
import {KeyRound, RefreshCw, Search} from "lucide-react";
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
  scan,
}: {
  explorer: KeyExplorer;
  inspection?: KeyInspection;
  isInspecting: boolean;
  isScanning: boolean;
  onInspect: (key: string) => void;
  onScan: (pattern: string, cursor: string) => void;
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
    <aside className="panel flex min-h-0 flex-col shadow-none">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h2 className="font-mono text-sm">Key explorer</h2>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {explorer.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Scan incrementally, then inspect a key with typed Redis operations.
        </p>
      </div>

      <form
        className="flex gap-2 border-b border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isScanning) onScan(pattern.trim() || "*", "0");
        }}
      >
        <Input
          value={pattern}
          placeholder="user:*"
          className="font-mono"
          onChange={(event) => setPattern(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          disabled={isScanning}
          aria-label="Scan keys"
        >
          <RefreshCw className={cn("size-4", isScanning && "animate-spin")} />
        </Button>
      </form>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(8rem,0.8fr)_minmax(12rem,1.2fr)]">
        <div className="min-h-0 overflow-auto border-b border-border">
          {scan?.keys.length ? (
            <div className="divide-y divide-border">
              {scan.keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-muted",
                    selectedKey === key && "bg-muted text-foreground",
                  )}
                  onClick={() => inspect(key)}
                >
                  <Search className="size-3 shrink-0 text-muted-foreground" />
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
                <code className="break-all text-sm text-foreground">
                  {inspection.key}
                </code>
                <span className="border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {inspection.exists ? inspection.type : "missing"}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Exists</dt>
                <dd className="font-mono">
                  {inspection.exists ? "yes" : "no"}
                </dd>
                <dt className="text-muted-foreground">TTL</dt>
                <dd className="font-mono">
                  {inspection.ttlSeconds === -1
                    ? "persistent"
                    : inspection.ttlSeconds === -2
                      ? "missing"
                      : `${inspection.ttlSeconds} seconds`}
                </dd>
                {inspection.size !== null ? (
                  <>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="font-mono">{inspection.size}</dd>
                  </>
                ) : null}
              </dl>
              {inspection.exists && inspection.value !== null ? (
                <pre className="mt-4 overflow-auto whitespace-pre-wrap break-all border border-border bg-black p-3 font-mono text-xs text-green-200">
                  {formatValue(inspection.value)}
                </pre>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
              <KeyRound className="mb-3 size-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select a scanned key to inspect its type, TTL, value, or size.
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
