import * as React from "react";
import { cn } from "../../lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[96px] w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
