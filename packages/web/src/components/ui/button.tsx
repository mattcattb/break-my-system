import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-sm border font-normal transition-none",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-60",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
        secondary:
          "border-border bg-surface-elevated text-foreground hover:bg-muted",
        outline:
          "border-border bg-surface text-foreground hover:bg-muted",
        ghost: "border-transparent text-foreground hover:border-border hover:bg-muted",
        danger:
          "border-danger bg-danger text-white hover:brightness-95 active:brightness-90",
        destructive:
          "border-danger bg-danger text-white hover:brightness-95 active:brightness-90",
      },
      size: {
        sm: "h-7 px-2 text-xs",
        md: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8",
      },
      effect: {
        none: "",
        glow: "btn-glow",
        sheen: "btn-sheen",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      effect: "none",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    asChild?: boolean;
  };
export function Button({
  className,
  variant,
  size,
  effect,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp      type={type}
      className={cn(buttonStyles({ variant, size, effect }), className)}
      {...props}
    />
  );
}
