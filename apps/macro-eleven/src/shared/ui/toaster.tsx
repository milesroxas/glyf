import { Toaster as Sonner } from "sonner";

/** Completion and error toasts, bottom-right, in the app's theme. */
function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      gap={8}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-lg !text-sm",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !font-medium",
          cancelButton: "!bg-muted !text-foreground",
          error: "[&_[data-icon]]:!text-destructive",
          success: "[&_[data-icon]]:!text-primary",
        },
      }}
    />
  );
}

export { Toaster };
