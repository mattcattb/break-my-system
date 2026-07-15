import {Toaster as SonnerToaster} from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="bottom-right"
      visibleToasts={4}
      gap={8}
      offset={{bottom: 20, right: 20}}
      mobileOffset={{bottom: 12, left: 12, right: 12}}
      toastOptions={{
        className:
          "border border-border bg-surface-elevated text-foreground shadow-lg",
        classNames: {
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          closeButton:
            "border border-border bg-background text-muted-foreground hover:text-foreground",
        },
      }}
    />
  );
}
