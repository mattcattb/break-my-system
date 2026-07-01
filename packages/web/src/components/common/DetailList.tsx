import {Badge} from "../ui/badge";
import {Card, CardContent} from "../ui/card";

type DetailItem = {
  label: string;
  value: string;
  badge?: string;
};

type DetailListProps = {
  title: string;
  description?: string;
  items: DetailItem[];
};

export function DetailList({title, description, items}: DetailListProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <dl className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="grid gap-1 border-t border-border/60 pt-3 sm:grid-cols-[9rem_1fr]"
            >
              <dt className="text-sm font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <span>{item.value}</span>
                {item.badge ? <Badge variant="primary">{item.badge}</Badge> : null}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
