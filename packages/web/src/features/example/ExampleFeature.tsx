import {DetailList} from "../../components/common/DetailList";
import {ResourceState} from "../../components/common/ResourceState";
import {Button} from "../../components/ui/button";
import {Card, CardContent} from "../../components/ui/card";
import {useClipboard} from "../../hooks/useClipboard";

const stackDetails = [
  {
    label: "Route",
    value: "Keep file routes thin and compose feature components inside them.",
  },
  {
    label: "Feature",
    value: "Colocate queries, hooks, state, and feature-only components.",
    badge: "src/features",
  },
  {
    label: "Common UI",
    value: "Promote components only when they are reusable across features.",
    badge: "components/common",
  },
];

export function ExampleFeature() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-4">
        <DetailList
          title="Example feature shape"
          description="This is intentionally small: a route imports a feature, and the feature uses common components plus UI primitives."
          items={stackDetails}
        />
        <ClipboardExample />
      </section>
      <ResourceState
        title="Delete-friendly by design"
        description="If this example stops being useful, remove src/features/example and this section from the home route."
      />
    </div>
  );
}

function ClipboardExample() {
  const {copied, copy, error} = useClipboard();
  const command = "bun run dev";

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="font-medium">Shared hook example</h3>
          <p className="text-sm text-muted-foreground">
            `useClipboard` is a small reusable UI hook that belongs in `src/hooks`.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
          <code className="text-sm">{command}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copy(command)}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
