import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/cn";

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground shadow-lg",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipRoot> & {
  content: React.ReactNode;
  children: React.ReactNode;
  align?: React.ComponentPropsWithoutRef<typeof TooltipContent>["align"];
  side?: React.ComponentPropsWithoutRef<typeof TooltipContent>["side"];};

export function Tooltip({
  content,
  children,
  align = "center",
  side = "top",
  ...props
}: TooltipProps) {
  const trigger = React.isValidElement(children) ? (
    <TooltipTrigger asChild>{children}</TooltipTrigger>
  ) : (
    <TooltipTrigger>{children}</TooltipTrigger>
  );

  return (
    <TooltipProvider>
      <TooltipRoot {...props}>
        {trigger}
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger };