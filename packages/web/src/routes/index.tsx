import {createFileRoute} from "@tanstack/react-router";
import {SystemsConsole} from "../features/systems/SystemsConsole";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div className="space-y-5">
          <div className="inline-flex rounded-md border border-border bg-surface px-3 py-1 text-sm text-muted-foreground">
            Infrastructure playground
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold sm:text-5xl">
              break-my-system
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              A small control plane for running from-scratch systems, sending
              commands to them, and resetting them after experiments.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-elevated p-4 text-sm">
          <div className="font-medium">First version scope</div>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>Static systems list</li>
            <li>Mock command execution</li>
            <li>Reset hook shape</li>
            <li>Plain web console before full terminal emulation</li>
          </ul>
        </div>
      </section>

      <SystemsConsole />
    </div>
  );
}
