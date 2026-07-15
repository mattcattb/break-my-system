import {useState} from "react";
import {KeyRound, Search} from "lucide-react";
import type {InferResponseType} from "hono/client";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {rpcClient} from "../../lib/rpc.client";

type RedisKeyInspection = InferResponseType<
  (typeof rpcClient.api.sandbox)[":sandboxId"]["terminal"][":terminalId"]["redis"]["inspect"]["$post"],
  200
>;

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

export function RedisKeyInspector({
  inspection,
  isInspecting,
  onInspect,
}: {
  inspection?: RedisKeyInspection;
  isInspecting: boolean;
  onInspect: (key: string) => void;
}) {
  const [key, setKey] = useState("");

  return (
    <aside className="flex min-h-0 flex-col border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <h2 className="font-mono text-sm">Key inspector</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Inspect a key you already know without scanning the whole database.
        </p>
      </div>
      <form
        className="flex gap-2 border-b border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmedKey = key.trim();
          if (trimmedKey && !isInspecting) onInspect(trimmedKey);
        }}
      >
        <Input
          value={key}
          placeholder="user:1"
          className="font-mono"
          onChange={(event) => setKey(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          disabled={!key.trim() || isInspecting}
          aria-label="Inspect key"
        >
          <Search className="size-4" />
        </Button>
      </form>
      {inspection ? (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <code className="break-all text-sm text-foreground">
              {inspection.key}
            </code>
            <span className="border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {inspection.exists ? inspection.type : "missing"}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Exists</dt>
            <dd className="font-mono">{inspection.exists ? "yes" : "no"}</dd>
            <dt className="text-muted-foreground">TTL</dt>
            <dd className="font-mono">
              {inspection.ttlSeconds === -1
                ? "persistent"
                : `${inspection.ttlSeconds} seconds`}
            </dd>
            <dt className="text-muted-foreground">Encoding</dt>
            <dd className="font-mono">{inspection.encoding ?? "—"}</dd>
            {inspection.size !== null ? (
              <>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-mono">{inspection.size}</dd>
              </>
            ) : null}
          </dl>
          {inspection.exists && inspection.value !== null ? (
            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Value
              </div>
              <pre className="overflow-auto whitespace-pre-wrap break-all border border-border bg-black p-3 font-mono text-xs text-green-200">
                {formatValue(inspection.value)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <KeyRound className="mb-3 size-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Key metadata and values will appear here.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">
            TYPE · TTL · OBJECT ENCODING · GET / HGETALL
          </p>
        </div>
      )}
    </aside>
  );
}
