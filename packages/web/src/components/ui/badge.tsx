import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeStyles = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-normal",
  {
    variants: {
      variant: {
        primary: "border-primary bg-white text-primary",
        neutral: "border-border bg-white text-muted-foreground",
        success: "border-success bg-white text-success",
        warning: "border-warning bg-white text-warning",
        danger: "border-danger bg-white text-danger",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);
export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeStyles>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}
