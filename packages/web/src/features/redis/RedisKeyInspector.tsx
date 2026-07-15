import {useState} from "react";
import {KeyRound, Search} from "lucide-react";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";

export function RedisKeyInspector() {
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
        onSubmit={(event) => event.preventDefault()}
      >
        <Input
          value={key}
          placeholder="user:1"
          className="font-mono"
          onChange={(event) => setKey(event.target.value)}
        />
        <Button type="submit" variant="secondary" size="icon" disabled title="Backend endpoint coming next">
          <Search className="size-4" />
        </Button>
      </form>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <KeyRound className="mb-3 size-7 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Key metadata and values will appear here.
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">
          TYPE · TTL · OBJECT ENCODING · GET / HGETALL
        </p>
        <span className="mt-4 border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
          backend endpoint next
        </span>
      </div>
    </aside>
  );
}
