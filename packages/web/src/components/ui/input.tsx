import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const inputStyles = cva(
  [
    "flex w-full rounded-sm border border-border bg-white px-2 py-1 text-sm text-foreground",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      size: {
        sm: "h-7",
        md: "h-8",
        lg: "h-9 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputStyles>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputStyles({ size }), className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
