import {cn} from "../../lib/cn";
import {Button} from "../ui/button";
import {Card, CardContent} from "../ui/card";

type ResourceStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "danger";
  className?: string;
};

export function ResourceState({
  title,
  description,
  actionLabel,
  onAction,
  tone = "default",
  className,
}: ResourceStateProps) {
  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div>
          <div
            className={cn(
              "text-base font-semibold",
              tone === "danger" ? "text-danger" : "text-foreground",
            )}
          >
            {title}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
